<?php

namespace App\Domain\Accounts;

use App\Domain\History\Audit;
use App\Domain\Scheduling\Schedules;
use App\Models\Account;
use App\Models\Occurrence;
use App\Models\Series;
use Illuminate\Validation\ValidationException;

final class CardSchedules
{
    public function configure(Account $account, string $purpose, bool $enabled, ?string $firstDate, array $recipients = []): void
    {
        $series = Series::where('generated_by_account_id', $account->id)->where('generated_purpose', $purpose)->first();
        if (! $enabled) {
            if ($series) {
                foreach (Occurrence::where('series_id', $series->id)->where('status', 'unpaid')->get() as $item) {
                    $before = $item->toArray();
                    $item->delete();
                    Audit::record($item, 'card_schedule_disabled', $before);
                }
                $before = $series->toArray();
                $series->delete();
                Audit::record($series, 'disabled', $before);
            }

            return;
        }
        if (! $firstDate) {
            throw ValidationException::withMessages(['first_date' => 'Choose an explicit first due date.']);
        }
        if ($purpose === 'fee' && ($account->fee_cents === null || ! $account->fee_cadence)) {
            throw ValidationException::withMessages(['fee' => 'Enter the fee and cadence in account settings first.']);
        }
        $lastPaid = Occurrence::whereIn('series_id', Series::withTrashed()->where('generated_by_account_id', $account->id)->where('generated_purpose', $purpose)->pluck('id'))->where('status', 'paid')->max('due_date');
        if (! $series && $lastPaid && $firstDate <= $lastPaid) {
            throw ValidationException::withMessages(['first_date' => 'Choose a due date after the last completed generated payment.']);
        }
        if ($series) {
            $anchor = Occurrence::where('series_id', $series->id)->where('status', 'unpaid')->where('due_date', '>=', $firstDate)->orderBy('due_date')->first();
            if (! $anchor) {
                throw ValidationException::withMessages(['first_date' => 'Choose an existing unpaid payment to apply settings from.']);
            }
            app(Schedules::class)->edit($series, $anchor, ['first_date' => $firstDate, 'recipient_ids' => $recipients, 'account_ids' => $account->usual_paying_account_id ? [$account->usual_paying_account_id] : [], ...($purpose === 'fee' ? ['amount_cents' => $account->fee_cents, 'frequency' => $account->fee_cadence] : [])], 'future');

            return;
        }
        $series = Series::create(['kind' => 'bill', 'name' => $account->name.($purpose === 'statement' ? ' · statement' : ' · fee'), 'amount_cents' => $purpose === 'statement' ? null : $account->fee_cents,
            'frequency' => $purpose === 'statement' ? 'monthly' : $account->fee_cadence, 'first_date' => $firstDate, 'generated_by_account_id' => $account->id, 'generated_purpose' => $purpose,
            'account_ids' => $account->usual_paying_account_id ? [$account->usual_paying_account_id] : [], 'recipient_ids' => $recipients]);
        app(Schedules::class)->materialize($series, now()->addMonths(18)->toDateString());
        Audit::record($series, 'generated');
    }
}
