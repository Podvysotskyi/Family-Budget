<?php

namespace App\Domain\Budget;

use App\Models\BudgetAlert;
use App\Models\Category;
use App\Models\TargetOverride;
use App\Models\TargetPeriod;
use App\Models\Transaction;
use App\Support\HouseholdContext;
use Carbon\CarbonImmutable as Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class Budget
{
    public function target(string $category, string $month): ?int
    {
        $override = TargetOverride::where('category_id', $category)->where('month', $month.'-01')->first();
        if ($override) {
            return $override->target_cents === null ? null : (int) $override->target_cents;
        }
        $period = TargetPeriod::where('category_id', $category)->where('start_month', '<=', $month.'-01')->where(fn ($q) => $q->whereNull('end_month')->orWhere('end_month', '>', $month.'-01'))->orderByDesc('start_month')->first();

        return $period?->target_cents === null ? null : (int) $period->target_cents;
    }

    public function report(string $month): array
    {
        $start = Date::parse($month.'-01');
        $end = $start->addMonth();
        $rows = DB::select(<<<'SQL'
SELECT COALESCE(c.parent_id,c.id)::text root_id, SUM(-t.amount_cents)::text spent, COUNT(*) count
FROM transactions t LEFT JOIN categories c ON c.id=t.category_id AND c.household_id=t.household_id
WHERE t.household_id=? AND t.deleted_at IS NULL AND NOT t.hidden AND t.transaction_date>=? AND t.transaction_date<?
AND COALESCE(t.manual_classification,t.provider_classification,'ordinary') NOT IN ('transfer','card_repayment','investment_purchase','investment_sale')
AND (c.kind='expense' OR (t.category_id IS NULL AND t.amount_cents<0))
GROUP BY COALESCE(c.parent_id,c.id)
SQL, [app(HouseholdContext::class)->id, $start->toDateString(), $end->toDateString()]);
        $stats = collect($rows)->keyBy(fn ($r) => $r->root_id ?? 'uncategorized');
        $result = [];
        $categories = Category::withTrashed()->where('kind', 'expense')->orderBy('name')->get();
        foreach ($categories as $c) {
            $s = $stats->get($c->id);
            $target = $this->target($c->id, $month);
            if ($c->parent_id && $target === null) {
                continue;
            }
            $spent = (int) ($s?->spent ?? 0);
            if ($target === null && ! $s) {
                continue;
            }
            $result[] = ['id' => $c->id, 'name' => $c->name.($c->deleted_at ? ' (deleted)' : ($c->parent_id ? ' (historical target)' : '')), 'count' => (int) ($s?->count ?? 0), 'spent_cents' => (string) $spent, 'target_cents' => $target === null ? null : (string) $target, 'remaining_cents' => $target === null ? null : (string) ($target - $spent), 'over_cents' => $target === null ? null : (string) max(0, $spent - $target), 'alerted' => BudgetAlert::where('category_id', $c->id)->where('month', $month.'-01')->exists()];
        }
        if ($s = $stats->get('uncategorized')) {
            $result[] = ['id' => 'uncategorized', 'name' => 'Uncategorized', 'count' => (int) $s->count, 'spent_cents' => (string) $s->spent, 'target_cents' => null, 'remaining_cents' => null, 'over_cents' => null, 'alerted' => false];
        }

        return $result;
    }

    public function eligible(string $month, ?string $root = null)
    {
        $start = Date::parse($month.'-01');
        $q = Transaction::query()->where('hidden', false)->whereBetween('transaction_date', [$start->toDateString(), $start->endOfMonth()->toDateString()])
            ->whereRaw("COALESCE(manual_classification,provider_classification,'ordinary') NOT IN ('transfer','card_repayment','investment_purchase','investment_sale')")
            ->where(function ($q) {
                $q->whereIn('category_id', Category::where('kind', 'expense')->pluck('id'))->orWhere(fn ($q) => $q->whereNull('category_id')->where('amount_cents', '<', 0));
            });
        if ($root === 'uncategorized') {
            $q->whereNull('category_id');
        } elseif ($root) {
            if (Category::where('id', $root)->whereNotNull('parent_id')->exists()) {
                $q->whereRaw('1=0');
            } else {
                $q->whereIn('category_id', Category::where('id', $root)->orWhere('parent_id', $root)->pluck('id'));
            }
        }

        return $q;
    }

    public function evaluate(): void
    {
        $month = now('UTC')->format('Y-m');
        $house = app(HouseholdContext::class)->id;
        DB::select('select pg_advisory_xact_lock(hashtext(?))', ['budget:'.$house.':'.$month]);
        foreach ($this->report($month) as $row) {
            if ($row['target_cents'] === null || (int) $row['spent_cents'] <= (int) $row['target_cents'] || $row['alerted']) {
                continue;
            }
            $alert = BudgetAlert::create(['category_id' => $row['id'], 'month' => $month.'-01', 'target_cents' => $row['target_cents'], 'spent_cents' => $row['spent_cents']]);
            foreach (DB::table('household_members')->where('household_id', $house)->whereNull('deleted_at')->whereNotNull('user_id')->get() as $member) {
                DB::table('notifications')->insertOrIgnore(['id' => (string) Str::uuid(), 'user_id' => $member->user_id, 'household_id' => $house, 'kind' => 'budget', 'deduplication_key' => $alert->id.':'.$member->user_id, 'data' => json_encode(['title' => $row['name'].' is over target', 'destination' => '/budget?month='.$month.'&category='.$row['id']]), 'created_at' => now(), 'updated_at' => now()]);
            }
        }
    }
}
