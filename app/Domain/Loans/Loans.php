<?php

namespace App\Domain\Loans;

use App\Domain\History\Audit;
use App\Domain\Scheduling\Recurrence;
use App\Models\Account;
use App\Models\BalanceEvent;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\Occurrence;
use App\Models\Series;
use App\Models\SeriesRevision;
use App\Models\Suppression;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

final class Loans
{
    public function paid(Loan $loan): int
    {
        return (int) LoanPayment::where('loan_id', $loan->id)->whereNull('reversed_at')->sum('amount_cents');
    }

    public function projection(Loan $loan): array
    {
        if (! $loan->series_id) {
            return [];
        }
        $series = Series::findOrFail($loan->series_id);
        $remaining = (int) $loan->repayment_total_cents - $this->paid($loan);
        $items = Occurrence::withTrashed()->where('series_id', $series->id)->get()->keyBy('generation_key');
        $suppressions = Suppression::where('series_id', $series->id)->get();
        $result = [];
        foreach (app(Recurrence::class)->slots($series->toArray(), now()->addYears(50)->toDateString()) as $slot) {
            if ($remaining <= 0) {
                break;
            }
            $item = $items->get($slot['key']);
            if ($this->isSuppressed($slot['slot'], $suppressions) || ($item && (($item->deleted_at && ! ($item->overrides['loan_tail_trimmed'] ?? false)) || $item->status === 'paid'))) {
                continue;
            }
            $amount = min((int) $loan->installment_cents, $remaining);
            $remaining -= $amount;
            $result[] = ['due_date' => $item?->due_date ?? $slot['date'], 'amount_cents' => (string) $amount];
        }
        usort($result, fn ($a, $b) => strcmp($a['due_date'], $b['due_date']));

        return $result;
    }

    public function rebuild(Loan $loan, string $kind = 'loan_recalculation'): void
    {
        $paid = $this->paid($loan);
        $remaining = (int) $loan->repayment_total_cents - $paid;
        if ($remaining < 0) {
            throw ValidationException::withMessages(['amount' => 'The repayment total cannot be less than payments already made.']);
        }
        $account = Account::whereKey($loan->account_id)->lockForUpdate()->firstOrFail();
        $loan->increment('lock_version');
        $old = (int) $account->balance_cents;
        $account->update(['balance_cents' => $remaining, 'balance_date' => now('UTC')->toDateString(), 'balance_observed_at' => now(), 'lock_version' => $account->lock_version + 1]);
        if ($old !== $remaining) {
            BalanceEvent::create(['account_id' => $account->id, 'kind' => $kind, 'balance_cents' => $remaining, 'delta_cents' => $remaining - $old, 'effective_date' => now('UTC')->toDateString()]);
        }
        if (! $loan->series_id) {
            return;
        }
        $this->materialize($loan);
    }

    public function materialize(Loan $loan): void
    {
        $account = Account::findOrFail($loan->account_id);
        $remaining = (int) $loan->repayment_total_cents - $this->paid($loan);
        $series = Series::findOrFail($loan->series_id);
        $installment = (int) $loan->installment_cents;
        if ($installment <= 0) {
            throw ValidationException::withMessages(['installment' => 'The installment must be greater than zero.']);
        }
        $slots = app(Recurrence::class)->slots($series->toArray(), now()->addYears(50)->toDateString());
        $items = Occurrence::withTrashed()->where('series_id', $series->id)->get()->keyBy('generation_key');
        $suppressions = Suppression::where('series_id', $series->id)->get();
        $revisions = SeriesRevision::where('series_id', $series->id)->orderBy('revision_number')->get();
        foreach ($slots as $slot) {
            $item = $items->get($slot['key']);
            if ($this->isSuppressed($slot['slot'], $suppressions)) {
                continue;
            }
            if ($item && $item->status === 'paid' && ! $item->deleted_at) {
                continue;
            }
            if ($item?->deleted_at && ! ($item->overrides['loan_tail_trimmed'] ?? false)) {
                continue;
            }
            if ($remaining === 0) {
                if ($item && ! $item->deleted_at) {
                    $item->update(['overrides' => [...($item->overrides ?? []), 'loan_tail_trimmed' => true], 'lock_version' => $item->lock_version + 1, 'reminder_version' => $item->reminder_version + 1]);
                    $item->delete();
                }

                continue;
            }
            $amount = min($installment, $remaining);
            $remaining -= $amount;
            $selectedAccounts = $item?->account_ids ?? $series->account_ids;
            if (! $item) {
                foreach ($revisions->where('anchor_slot', '<=', $slot['slot']) as $revision) {
                    if (array_key_exists('account_ids', $revision->changes)) {
                        $selectedAccounts = $revision->changes['account_ids'];
                    }
                }
            }
            $values = ['kind' => 'loan_installment', 'name' => $account->name, 'amount_cents' => $amount, 'account_ids' => $selectedAccounts, 'recipient_ids' => $series->recipient_ids, 'member_id' => $series->member_id, 'category_id' => $series->category_id, 'slot_order' => $slot['slot']];
            if ($item) {
                if ($item->deleted_at) {
                    $overrides = $item->overrides ?? [];
                    unset($overrides['loan_tail_trimmed']);
                    $item->fill(['deleted_at' => null, 'overrides' => $overrides]);
                }
                $item->fill($values);
                if ($item->isDirty()) {
                    $item->fill(['lock_version' => $item->lock_version + 1, 'reminder_version' => $item->reminder_version + 1]);
                    $item->save();
                }
            } elseif ($slot['date'] <= now()->addMonths(18)->toDateString()) {
                Occurrence::create([...$values, 'series_id' => $series->id, 'generation_key' => $slot['key'], 'slot_order' => $slot['slot'], 'due_date' => $slot['date'], 'status' => 'unpaid']);
            }
        }
    }

    private function isSuppressed(int $slot, Collection $ranges): bool
    {
        return $ranges->contains(fn ($range) => $slot >= $range->first_slot && ($range->last_slot === null || $slot <= $range->last_slot));
    }

    public function pay(Loan $loan, int $amount, string $date, ?Occurrence $item = null, array $accounts = []): LoanPayment
    {
        $remaining = (int) $loan->repayment_total_cents - $this->paid($loan);
        if ($amount <= 0 || $amount > $remaining) {
            throw ValidationException::withMessages(['amount' => 'Payment must be positive and cannot exceed the remaining balance.']);
        }
        $payment = LoanPayment::create(['loan_id' => $loan->id, 'occurrence_id' => $item?->id, 'kind' => $item ? 'installment' : 'extra', 'amount_cents' => $amount, 'payment_date' => $date, 'account_ids' => $accounts]);
        if ($item) {
            $item->update(['status' => 'paid', 'completed_date' => $date, 'lock_version' => $item->lock_version + 1]);
        }
        Audit::record($payment, 'paid');
        $this->rebuild($loan, 'loan_payment');

        return $payment;
    }
}
