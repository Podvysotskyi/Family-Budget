<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\HoldingPosition;
use App\Models\HoldingSnapshot;
use App\Models\InvestmentActivity;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class InvestmentController extends FinanceController
{
    public function index(Request $request): Response
    {
        $request->validate(['account' => 'nullable|uuid']);
        $accounts = Account::where('type', 'investment')->orderBy('name')->get();
        $account = $request->filled('account') ? Account::where('type', 'investment')->findOrFail($request->input('account')) : $accounts->first();
        $snapshot = $account ? HoldingSnapshot::where('account_id', $account->id)->latest('observed_at')->orderByDesc('id')->first() : null;
        $positionQuery = HoldingPosition::where('snapshot_id', $snapshot?->id);
        $totals = (clone $positionQuery)->selectRaw('COUNT(*) as position_count, COUNT(market_value_cents) as value_count, COUNT(cost_basis_cents) as cost_count, SUM(market_value_cents) as value_cents, SUM(cost_basis_cents) as cost_cents')->first();
        $knownValue = $snapshot?->complete && $totals->position_count === $totals->value_count;
        $knownCost = $knownValue && $totals->position_count === $totals->cost_count;
        $value = $knownValue ? (int) $totals->value_cents : null;
        $cost = $knownCost ? (int) $totals->cost_cents : null;
        $positions = $positionQuery->orderBy('description')->orderBy('id')->paginate($this->pageSize($request), ['*'], 'holdings_page')->withQueryString();
        $gain = $cost !== null ? $value - $cost : null;
        $activity = null;
        if ($account) {
            $reported = InvestmentActivity::where('account_id', $account->id)
                ->where(fn ($query) => $query->whereNull('transaction_id')->orWhereIn('transaction_id', Transaction::where('hidden', false)->select('id')))
                ->selectRaw("id, activity_date, kind, amount_cents, transaction_id, null::text as description, 'reported' as source")->toBase();
            $cash = Transaction::where('account_id', $account->id)->where('hidden', false)
                ->whereNotIn('id', InvestmentActivity::where('account_id', $account->id)->whereNotNull('transaction_id')->select('transaction_id'))
                ->selectRaw("id, transaction_date as activity_date, coalesce(manual_classification, provider_classification, 'cash_flow') as kind, amount_cents, id as transaction_id, payee as description, 'transaction' as source")->toBase();
            $activity = DB::query()->fromSub($reported->unionAll($cash), 'investment_entries')->orderByDesc('activity_date')->orderBy('id')
                ->paginate($this->pageSize($request), ['*'], 'activity_page')->withQueryString();
            $activity->through(fn ($row) => [...(array) $row, 'amount_cents' => $row->amount_cents === null ? null : (string) $row->amount_cents]);
        }

        return Inertia::render('Finance/Index', ['section' => 'investments', 'records' => $accounts, 'catalog' => $this->catalog(),
            'investment' => ['account' => $account, 'snapshot' => $snapshot, 'positions' => $positions, 'activity' => $activity,
                'summary' => ['holdings_cents' => $value === null ? null : (string) $value, 'gain_cents' => $gain === null ? null : (string) $gain,
                    'gain_percent' => $cost ? round($gain / $cost * 100, 2) : null, 'cash_cents' => $snapshot?->cash_cents === null ? null : (string) $snapshot->cash_cents]],
            'filters' => ['account' => $account?->id]]);
    }
}
