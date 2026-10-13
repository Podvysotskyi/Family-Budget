<?php

namespace App\Domain\Scheduling;

use App\Domain\History\Audit;
use App\Models\Account;
use App\Models\Category;
use App\Models\Occurrence;
use App\Models\Series;
use App\Models\SeriesRevision;
use App\Models\Suppression;
use Carbon\CarbonImmutable as Date;

final class Schedules
{
    private const RULE_FIELDS = ['frequency', 'first_date', 'day_one', 'day_two'];

    private const VALUE_FIELDS = ['name', 'amount_cents', 'category_id', 'member_id', 'account_ids', 'recipient_ids'];

    public function valuesAt(Series $series, int $slot): array
    {
        $values = $series->only(self::VALUE_FIELDS);
        foreach (SeriesRevision::where('series_id', $series->id)->where('anchor_slot', '<=', $slot)->orderBy('revision_number')->get() as $revision) {
            $values = array_replace($values, array_intersect_key($revision->changes, array_flip(self::VALUE_FIELDS)));
        }

        return $values;
    }

    public function materialize(Series $series, string $through): void
    {
        if ($series->stop_from) {
            $through = min($through, Date::parse($series->stop_from)->subDay()->toDateString());
        }
        $revisions = SeriesRevision::where('series_id', $series->id)->orderBy('revision_number')->get();
        if ($revisions->isEmpty()) {
            SeriesRevision::create(['series_id' => $series->id, 'revision_number' => 0, 'anchor_slot' => 0, 'changes' => [],
                'rule_snapshot' => $series->only(['frequency', 'first_date', 'end_date', 'day_one', 'day_two'])]);
            $revisions = SeriesRevision::where('series_id', $series->id)->orderBy('revision_number')->get();
        }
        $initial = $revisions->first()->rule_snapshot;
        $segments = [['anchor' => 0, 'rule' => $initial]];
        foreach ($revisions as $revision) {
            if (! array_intersect(array_keys($revision->changes), self::RULE_FIELDS)) {
                continue;
            }
            $segments = array_values(array_filter($segments, fn ($segment) => $segment['anchor'] < $revision->anchor_slot));
            $segments[] = ['anchor' => $revision->anchor_slot, 'rule' => array_replace($revision->rule_snapshot, $revision->changes)];
        }
        usort($segments, fn ($left, $right) => $left['anchor'] <=> $right['anchor']);
        $suppressions = Suppression::where('series_id', $series->id)->get();
        foreach ($segments as $segmentIndex => $segment) {
            foreach (app(Recurrence::class)->slots([...$segment['rule'], 'end_date' => null], $through) as $slot) {
                $slot['slot'] += $segment['anchor'];
                $slot['key'] = 'slot:'.$slot['slot'];
                $nextAnchor = $segments[$segmentIndex + 1]['anchor'] ?? null;
                if ($nextAnchor !== null && $slot['slot'] >= $nextAnchor) {
                    continue;
                }
                if ($suppressions->contains(fn ($s) => $slot['slot'] >= $s->first_slot && ($s->last_slot === null || $slot['slot'] <= $s->last_slot))) {
                    continue;
                }
                $end = $initial['end_date'] ?? null;
                $values = $series->only(['kind', ...self::VALUE_FIELDS]);
                foreach ($revisions as $revision) {
                    if ($slot['slot'] < $revision->anchor_slot) {
                        continue;
                    }
                    $values = array_replace($values, array_intersect_key($revision->changes, array_flip(self::VALUE_FIELDS)));
                    if (array_key_exists('end_date', $revision->changes)) {
                        $end = $revision->changes['end_date'];
                    }
                }
                if ($end && $slot['date'] > $end) {
                    continue;
                }
                if ($series->kind === 'subscription' && $series->cancel_date && $slot['date'] >= $series->cancel_date) {
                    continue;
                }
                if (! empty($values['category_id'])) {
                    $category = Category::withTrashed()->find($values['category_id']);
                    $seen = [];
                    while ($category?->deleted_at && ! in_array($category->id, $seen)) {
                        $seen[] = $category->id;
                        $category = $category->replacement_id ? Category::withTrashed()->find($category->replacement_id) : null;
                    }
                    $values['category_id'] = $category && ! $category->deleted_at ? $category->id : null;
                }
                $values['account_ids'] = Account::whereIn('id', $values['account_ids'] ?? [])->pluck('id')->all();
                Occurrence::withTrashed()->firstOrCreate(['series_id' => $series->id, 'generation_key' => $slot['key']], [
                    ...$values, 'slot_order' => $slot['slot'], 'due_date' => $slot['date'], 'status' => $series->kind === 'income' ? 'not_received' : 'unpaid',
                ]);
            }
        }
        $series->update(['generated_through' => max($through, $series->generated_through ?? $through)]);
    }

    public function edit(Series $series, Occurrence $anchor, array $changes, string $scope): void
    {
        if ($scope === 'occurrence') {
            $allowed = array_intersect_key($changes, array_flip([...self::VALUE_FIELDS, 'due_date']));
            $before = $anchor->toArray();
            $anchor->fill($allowed);
            $anchor->overrides = [...($anchor->overrides ?? []), ...array_fill_keys(array_keys($allowed), true)];
            $anchor->lock_version++;
            $anchor->reminder_version++;
            $anchor->save();
            $series->increment('lock_version');
            Audit::record($anchor, 'edited', $before);

            return;
        }
        $before = $series->toArray();
        $dateChanged = (bool) array_intersect(array_keys($changes), self::RULE_FIELDS);
        if ($dateChanged && ! isset($changes['first_date'])) {
            $changes['first_date'] = $anchor->due_date;
        }
        $newRule = array_replace($series->only(['frequency', 'first_date', 'end_date', 'day_one', 'day_two']), $changes);
        SeriesRevision::create(['series_id' => $series->id, 'revision_number' => $series->lock_version, 'anchor_slot' => $anchor->slot_order,
            'changes' => $changes, 'rule_snapshot' => $series->only(['frequency', 'first_date', 'end_date', 'day_one', 'day_two'])]);
        $slots = $dateChanged ? app(Recurrence::class)->slots($newRule, now()->addYears(50)->toDateString()) : [];
        foreach (Occurrence::where('series_id', $series->id)->where('slot_order', '>=', $anchor->slot_order)->orderBy('slot_order')->get() as $item) {
            if (in_array($item->status, ['paid', 'received'])) {
                continue;
            }
            $slot = $slots[$item->slot_order - $anchor->slot_order] ?? null;
            $old = $item->toArray();
            $item->fill(array_intersect_key($changes, array_flip(self::VALUE_FIELDS)));
            if ($dateChanged && $slot) {
                $item->due_date = $slot['date'];
            }
            if (($dateChanged && ! $slot) || (! empty($changes['end_date']) && $item->due_date > $changes['end_date'])) {
                $item->delete();
                Audit::record($item, 'removed_by_schedule_edit', $old);

                continue;
            }
            $overrides = $item->overrides ?? [];
            foreach (array_keys($changes) as $field) {
                unset($overrides[$field]);
            }
            $item->overrides = $overrides;
            $item->lock_version++;
            $item->reminder_version++;
            $item->save();
            Audit::record($item, 'series_edited', $old);
        }
        $series->fill(array_intersect_key($changes, array_flip(['frequency', 'first_date', 'end_date', 'day_one', 'day_two'])));
        $series->lock_version++;
        $series->save();
        Audit::record($series, 'future_edited', $before);
        $this->materialize($series, now()->addMonths(18)->toDateString());
    }

    public function remove(Series $series, Occurrence $anchor, string $scope): void
    {
        Suppression::create(['series_id' => $series->id, 'first_slot' => $anchor->slot_order, 'last_slot' => $scope === 'occurrence' ? $anchor->slot_order : null, 'reason' => 'member_deleted']);
        foreach (Occurrence::where('series_id', $series->id)->where('slot_order', $scope === 'occurrence' ? '=' : '>=', $anchor->slot_order)->get() as $item) {
            $before = $item->toArray();
            $item->delete();
            Audit::record($item, 'deleted', $before);
        }
        $series->increment('lock_version');
    }
}
