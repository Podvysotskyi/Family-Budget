<?php

namespace App\Domain\Loans;

use App\Domain\History\Audit;
use App\Domain\Scheduling\Recurrence;
use App\Domain\Shared\Money;
use App\Models\Account;
use App\Models\BalanceEvent;
use App\Models\Category;
use App\Models\Loan;
use App\Models\LoanCheckpoint;
use App\Models\LoanPayment;
use App\Models\Occurrence;
use App\Models\Series;
use App\Models\SeriesRevision;
use Illuminate\Validation\ValidationException;

final class LoanTerms
{
    public function update(Loan $loan, array $values): void
    {
        $service = app(Loans::class);
        $account = Account::findOrFail($loan->account_id);
        $before = $loan->toArray();
        $oldAccount = $account->toArray();
        $scheduled = $values['scheduled'] ?? (bool) $loan->series_id;
        if ($scheduled) {
            $current = $loan->series_id ? Series::findOrFail($loan->series_id)->toArray() : [];
            $rule = [...$current, ...$values];
            if (($rule['frequency'] ?? 'monthly') === 'twice_monthly' && (empty($rule['day_one']) || empty($rule['day_two']) || $rule['day_one'] == $rule['day_two'])) {
                throw ValidationException::withMessages(['day_two' => 'Choose two different days of the month.']);
            }
        }
        $account->update(['name' => $values['name'], 'member_id' => array_key_exists('member_id', $values) ? $values['member_id'] : $account->member_id, 'institution_name' => array_key_exists('lender', $values) ? $values['lender'] : $account->institution_name, 'notes' => array_key_exists('notes', $values) ? $values['notes'] : $account->notes]);
        if (! $scheduled && $loan->series_id) {
            $series = Series::findOrFail($loan->series_id);
            LoanCheckpoint::create(['loan_id' => $loan->id, 'balance_cents' => $account->balance_cents, 'effective_date' => now('UTC')->toDateString(), 'included_payment_ids' => LoanPayment::where('loan_id', $loan->id)->whereNull('reversed_at')->pluck('id')->all(), 'state' => 'reconciled']);
            foreach (Occurrence::where('series_id', $series->id)->where('status', 'unpaid')->get() as $item) {
                $old = $item->toArray();
                $item->delete();
                Audit::record($item, 'loan_schedule_disabled', $old);
            }
            $series->delete();
            $loan->series_id = null;
            $loan->tracking_mode = 'balance';
        } elseif ($scheduled && ! $loan->series_id) {
            $balance = isset($values['balance']) ? Money::parse($values['balance']) : (int) $account->balance_cents;
            $installment = Money::parse($values['installment'] ?? '0');
            if ($installment <= 0) {
                throw ValidationException::withMessages(['installment' => 'Enter a positive installment.']);
            }
            $series = Series::create(['name' => $account->name, 'kind' => 'loan_installment', 'amount_cents' => $installment, 'frequency' => $values['frequency'] ?? 'monthly', 'first_date' => $values['first_date'] ?? now()->toDateString(),
                'day_one' => $values['day_one'] ?? null, 'day_two' => $values['day_two'] ?? null, 'category_id' => Category::where('system_key', 'loan_payments')->value('id'), 'account_ids' => $values['account_ids'] ?? [], 'recipient_ids' => $values['recipient_ids'] ?? []]);
            $loan->series_id = $series->id;
            $loan->tracking_mode = 'full';
            $loan->repayment_total_cents = $balance + $service->paid($loan);
            $loan->installment_cents = $installment;
            LoanCheckpoint::create(['loan_id' => $loan->id, 'balance_cents' => $balance, 'effective_date' => now('UTC')->toDateString(), 'included_payment_ids' => LoanPayment::where('loan_id', $loan->id)->whereNull('reversed_at')->pluck('id')->all(), 'state' => 'reconciled']);
        }
        if ($scheduled) {
            if (isset($values['repayment_total']) && $loan->getOriginal('series_id')) {
                $loan->repayment_total_cents = Money::parse($values['repayment_total']);
            }
            if (isset($values['installment'])) {
                $loan->installment_cents = Money::parse($values['installment']);
            }
            $series = Series::findOrFail($loan->series_id);
            $terms = array_intersect_key($values, array_flip(['frequency', 'first_date', 'day_one', 'day_two', 'recipient_ids', 'member_id']));
            $dateChanged = false;
            foreach (['frequency', 'first_date', 'day_one', 'day_two'] as $key) {
                if (in_array($key, ['day_one', 'day_two']) && ($terms['frequency'] ?? $series->frequency) !== 'twice_monthly') {
                    continue;
                }
                if (isset($terms[$key]) && $terms[$key] != $series->getAttribute($key)) {
                    $dateChanged = true;
                }
            }
            $series->update([...$terms, 'name' => $account->name, 'amount_cents' => $loan->installment_cents]);
            if (isset($values['account_ids']) && $values['account_ids'] !== $series->account_ids) {
                $anchor = Occurrence::where('series_id', $series->id)->find($values['anchor_id'] ?? '');
                if ($anchor) {
                    $scope = $values['scope'] ?? 'future';
                    if ($scope === 'future') {
                        SeriesRevision::create(['series_id' => $series->id, 'revision_number' => $series->lock_version, 'anchor_slot' => $anchor->slot_order, 'changes' => ['account_ids' => $values['account_ids']], 'rule_snapshot' => $series->only(['frequency', 'first_date', 'end_date', 'day_one', 'day_two'])]);
                    }
                    foreach (Occurrence::where('series_id', $series->id)->where('slot_order', $scope === 'occurrence' ? '=' : '>=', $anchor->slot_order)->where('status', 'unpaid')->get() as $item) {
                        $old = $item->toArray();
                        $item->update(['account_ids' => $values['account_ids'], 'lock_version' => $item->lock_version + 1]);
                        Audit::record($item, 'paying_accounts_edited', $old);
                    }
                } elseif ($loan->getOriginal('series_id')) {
                    throw ValidationException::withMessages(['anchor_id' => 'Choose an installment to apply paying-account changes from.']);
                }
            }
            $series->increment('lock_version');
            $loan->save();
            $service->rebuild($loan);
            if ($dateChanged) {
                $slots = collect(app(Recurrence::class)->slots($series->toArray(), now()->addYears(50)->toDateString()))->keyBy('key');
                foreach (Occurrence::where('series_id', $series->id)->orderBy('slot_order')->get() as $item) {
                    $slot = $slots->get($item->generation_key);
                    if ($item->status !== 'paid' && $slot) {
                        $old = $item->toArray();
                        $item->update(['due_date' => $slot['date'], 'reminder_version' => $item->reminder_version + 1]);
                        Audit::record($item, 'loan_terms_edited', $old);
                    }
                }
            }
        } else {
            if (isset($values['balance']) && ! $loan->getOriginal('series_id')) {
                $balance = Money::parse($values['balance']);
                $account->update(['balance_cents' => $balance, 'balance_date' => $values['balance_date'] ?? now()->toDateString(), 'lock_version' => $account->lock_version + 1]);
                BalanceEvent::create(['account_id' => $account->id, 'kind' => 'manual_update', 'balance_cents' => $balance, 'effective_date' => $account->balance_date]);
            }
            $loan->lock_version++;
            $loan->save();
        }
        $loan->update(['lender' => array_key_exists('lender', $values) ? $values['lender'] : $loan->lender, 'notes' => array_key_exists('notes', $values) ? $values['notes'] : $loan->notes]);
        Audit::record($account, 'loan_terms_edited', $oldAccount);
        Audit::record($loan, 'edited', $before);
    }
}
