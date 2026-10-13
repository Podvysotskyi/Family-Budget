<?php

namespace Tests\Feature;

use App\Domain\Notifications\LocalDeliveryTime;
use App\Domain\Notifications\Reminders;
use App\Domain\Scheduling\Schedules;
use App\Models\Occurrence;
use App\Models\ReminderPlan;
use App\Models\Series;
use Illuminate\Support\Facades\DB;
use Tests\FinanceTestCase;

class ReminderTest extends FinanceTestCase
{
    public function test_dst_gap_uses_first_valid_instant_and_overlap_uses_earlier_instant(): void
    {
        $clock = app(LocalDeliveryTime::class);
        $this->assertSame('2026-03-08 08:00:00', $clock->resolve('2026-03-08', '02:30', 'America/Chicago')->format('Y-m-d H:i:s'));
        $this->assertSame('2026-11-01 06:30:00', $clock->resolve('2026-11-01', '01:30', 'America/Chicago')->format('Y-m-d H:i:s'));
    }

    public function test_reminder_delivers_once_and_new_late_item_does_not_catch_up(): void
    {
        $this->travelTo(now('UTC')->setDate(2026, 10, 3)->setTime(12, 0));
        [$user,$house,$member] = $this->household();
        $this->inHouse($house, function () use ($member) {
            $s = Series::factory()->create(['frequency' => 'once', 'first_date' => '2026-10-03', 'recipient_ids' => [$member->id]]);
            app(Schedules::class)->materialize($s, '2026-10-03');
            app(Reminders::class)->plan();
            $this->assertSame('scheduled', ReminderPlan::first()->state);
        });
        $this->travelTo(now('UTC')->setTime(15, 0));
        $this->inHouse($house, function () use ($user, $member) {
            $service = app(Reminders::class);
            $this->assertSame(1, $service->deliver());
            $this->assertSame(0, $service->deliver());
            $this->assertSame(1, DB::table('notifications')->where('user_id', $user->id)->count());
            $late = Series::factory()->create(['frequency' => 'once', 'first_date' => '2026-10-03', 'recipient_ids' => [$member->id]]);
            app(Schedules::class)->materialize($late, '2026-10-03');
            $service->plan();
            $o = Occurrence::where('series_id', $late->id)->first();
            $this->assertSame('skipped', ReminderPlan::where('occurrence_id', $o->id)->first()->state);
        });
    }
}
