<?php

namespace App\Domain\Notifications;

use App\Models\Member;
use App\Models\Occurrence;
use App\Models\ReminderDelivery;
use App\Models\ReminderPlan;
use App\Models\User;
use App\Support\HouseholdContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class Reminders
{
    public function plan(bool $settingsChanged = false): void
    {
        $house = app(HouseholdContext::class)->id;
        $eligible = Occurrence::whereIn('status', ['unpaid'])->where('kind', '!=', 'income')->where('due_date', '>=', now('UTC')->subDays(2)->toDateString())->get();
        $active = [];
        foreach ($eligible as $item) {
            foreach ($item->recipient_ids ?? [] as $memberId) {
                $member = Member::where('household_id', $house)->whereNotNull('user_id')->find($memberId);
                if (! $member) {
                    continue;
                }
                $user = User::find($member->user_id);
                $fingerprint = hash('sha256', implode('|', [$item->reminder_version, $item->due_date, $user->reminder_settings_version, $member->id, $user->id]));
                $scheduled = app(LocalDeliveryTime::class)->resolve($item->due_date, $user->reminder_local_time, $user->timezone);
                $previous = ReminderPlan::where('occurrence_id', $item->id)->where('recipient_member_id', $memberId)->get();
                $state = 'scheduled';
                if ($scheduled->isPast()) {
                    $today = now($user->timezone)->toDateString();
                    $state = $previous->isNotEmpty() && $item->due_date === $today ? 'scheduled' : 'skipped';
                    if ($state === 'scheduled') {
                        $scheduled = now('UTC')->toImmutable();
                    }
                }
                $plan = ReminderPlan::firstOrCreate(['occurrence_id' => $item->id, 'recipient_member_id' => $memberId, 'fingerprint' => $fingerprint], [
                    'recipient_user_id' => $user->id, 'scheduled_at' => $scheduled, 'state' => $state,
                ]);
                $active[] = $plan->id;
            }
        }
        ReminderPlan::where('state', 'scheduled')->whereNotIn('id', $active)->update(['state' => 'canceled']);
    }

    public function deliver(): int
    {
        $count = 0;
        $house = app(HouseholdContext::class)->id;
        foreach (ReminderPlan::where('state', 'scheduled')->where('scheduled_at', '<=', now())->lockForUpdate()->get() as $plan) {
            $item = Occurrence::find($plan->occurrence_id);
            $member = Member::where('household_id', $house)->where('user_id', $plan->recipient_user_id)->find($plan->recipient_member_id);
            $user = User::find($plan->recipient_user_id);
            if (! $item || ! $member || ! $user || $item->status !== 'unpaid' || ! in_array($member->id, $item->recipient_ids ?? []) || $item->due_date !== now($user->timezone)->toDateString()) {
                $plan->update(['state' => 'canceled']);

                continue;
            }
            if (ReminderDelivery::where('plan_id', $plan->id)->exists()) {
                $plan->update(['state' => 'delivered']);

                continue;
            }
            $id = (string) Str::uuid();
            DB::table('notifications')->insertOrIgnore(['id' => $id, 'user_id' => $user->id, 'household_id' => $house, 'kind' => 'reminder',
                'deduplication_key' => 'reminder:'.$plan->id, 'data' => json_encode(['title' => $item->name.' is due today', 'name' => $item->name, 'amount_cents' => $item->amount_cents === null ? null : (string) $item->amount_cents, 'due_date' => $item->due_date, 'occurrence_id' => $item->id, 'destination' => '/home?month='.substr($item->due_date, 0, 7).'&occurrence='.$item->id]),
                'created_at' => now(), 'updated_at' => now()]);
            $notification = DB::table('notifications')->where('deduplication_key', 'reminder:'.$plan->id)->first();
            ReminderDelivery::create(['plan_id' => $plan->id, 'notification_id' => $notification->id]);
            $plan->update(['state' => 'delivered']);
            $count++;
        }

        return $count;
    }
}
