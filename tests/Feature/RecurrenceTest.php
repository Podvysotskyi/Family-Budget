<?php

namespace Tests\Feature;

use App\Domain\Scheduling\Recurrence;
use App\Domain\Scheduling\Schedules;
use App\Models\Occurrence;
use App\Models\Series;
use Tests\FinanceTestCase;

class RecurrenceTest extends FinanceTestCase
{
    public function test_month_end_fallback_restores_nominal_day_and_twice_monthly_collision_stays_distinct(): void
    {
        $service = app(Recurrence::class);
        $dates = $service->slots(['frequency' => 'monthly', 'first_date' => '2026-01-31'], '2026-03-31');
        $this->assertSame(['2026-01-31', '2026-02-28', '2026-03-31'], array_column($dates, 'date'));
        $twice = $service->slots(['frequency' => 'twice_monthly', 'first_date' => '2026-02-01', 'day_one' => 30, 'day_two' => 31], '2026-02-28');
        $this->assertSame(['2026-02-28', '2026-02-28'], array_column($twice, 'date'));
        $this->assertNotSame($twice[0]['key'], $twice[1]['key']);
    }

    public function test_future_edit_preserves_earlier_and_completed_snapshots_and_tombstones_do_not_regenerate(): void
    {
        [, $house] = $this->household();
        $this->inHouse($house, function () {
            $s = Series::factory()->create(['first_date' => '2026-01-31']);
            $service = app(Schedules::class);
            $service->materialize($s, '2026-05-31');
            $items = Occurrence::orderBy('slot_order')->get();
            $items[3]->update(['status' => 'paid']);
            $service->edit($s, $items[1], ['amount_cents' => 20000], 'future');
            $this->assertSame(10000, (int) $items[0]->fresh()->amount_cents);
            $this->assertSame(20000, (int) $items[1]->fresh()->amount_cents);
            $this->assertSame(10000, (int) $items[3]->fresh()->amount_cents);
            $service->remove($s, $items[2], 'occurrence');
            $service->materialize($s, '2026-12-31');
            $this->assertSoftDeleted('occurrences', ['id' => $items[2]->id]);
            $this->assertSame(1, Occurrence::withTrashed()->where('series_id', $s->id)->where('generation_key', $items[2]->generation_key)->count());
        });
    }
}
