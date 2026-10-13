<?php

namespace App\Http\Controllers;

use App\Domain\Budget\Budget;
use App\Domain\History\Audit;
use App\Domain\Shared\Money;
use App\Models\Category;
use App\Models\TargetOverride;
use App\Models\TargetPeriod;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BudgetController extends FinanceController
{
    public function index(Request $r, Budget $budget)
    {
        $month = $r->validate(['month' => 'nullable|date_format:Y-m'])['month'] ?? now('UTC')->format('Y-m');
        $records = $budget->report($month);
        $selected = $r->input('category');
        if ($selected && $selected !== 'uncategorized') {
            $r->validate(['category' => 'uuid']);
            Category::withTrashed()->findOrFail($selected);
        }
        $breakdown = $selected ? $budget->eligible($month, $selected)->get()->groupBy(fn ($t) => $t->category_id ?? 'uncategorized')->map(fn ($rows, $id) => ['id' => $id, 'name' => Category::withTrashed()->find($id === 'uncategorized' ? null : $id)?->name ?? 'Uncategorized', 'count' => $rows->count(), 'spent_cents' => (string) -$rows->sum('amount_cents')])->values() : [];

        return Inertia::render('Finance/Index', ['section' => 'budget', 'month' => $month, 'records' => $records, 'catalog' => $this->catalog(), 'breakdown' => $breakdown, 'contributions' => $selected ? $budget->eligible($month, $selected)->latest('transaction_date')->paginate($this->pageSize($r))->withQueryString() : null, 'selectedCategory' => $selected]);
    }

    public function preview(Request $r): mixed
    {
        $v = $r->validate(['category_id' => 'required|uuid', 'month' => 'required|date_format:Y-m']);
        Category::whereNull('parent_id')->where('kind', 'expense')->findOrFail($v['category_id']);

        return response()->json(['overrides' => TargetOverride::where('category_id', $v['category_id'])->where('month', '>=', $v['month'].'-01')->orderBy('month')->get(), 'periods' => TargetPeriod::where('category_id', $v['category_id'])->where(fn ($q) => $q->whereNull('end_month')->orWhere('end_month', '>', $v['month'].'-01'))->orderBy('start_month')->get()]);
    }

    public function target(Request $r)
    {
        return $this->change($r, function () use ($r) {
            $v = $r->validate(['category_id' => 'required|uuid', 'month' => 'required|date_format:Y-m', 'amount' => 'present|nullable|string', 'scope' => 'required|in:month,future']);
            abort_if($v['month'] < now('UTC')->format('Y-m'), 422, 'Past-month targets are locked.');
            $c = Category::whereNull('parent_id')->where('kind', 'expense')->findOrFail($v['category_id']);
            $amount = $v['amount'] === null ? null : Money::parse($v['amount']);
            $month = $v['month'].'-01';
            if ($v['scope'] === 'month') {
                $record = TargetOverride::updateOrCreate(['category_id' => $c->id, 'month' => $month], ['target_cents' => $amount]);
                Audit::record($record, 'target_overridden');
            } else {
                foreach (TargetPeriod::where('category_id', $c->id)->where(fn ($q) => $q->whereNull('end_month')->orWhere('end_month', '>', $month))->get() as $period) {
                    $before = $period->toArray();
                    if ($period->start_month >= $month) {
                        $period->delete();
                    } else {
                        $period->update(['end_month' => $month]);
                    }Audit::record($period, 'target_superseded', $before);
                }foreach (TargetOverride::where('category_id', $c->id)->where('month', '>=', $month)->get() as $override) {
                    $before = $override->toArray();
                    $override->delete();
                    Audit::record($override, 'target_override_replaced', $before);
                }$record = TargetPeriod::create(['category_id' => $c->id, 'start_month' => $month, 'target_cents' => $amount]);
                Audit::record($record, 'target_changed');
            }

            return $record;
        }, 'Budget target updated.');
    }
}
