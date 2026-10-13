<?php

namespace App\Http\Controllers;

use App\Domain\Accounts\CardSchedules;
use App\Domain\History\Audit;
use App\Domain\Loans\Loans;
use App\Domain\Shared\Money;
use App\Models\Account;
use App\Models\BalanceEvent;
use App\Models\Connection;
use App\Models\CreditLimit;
use App\Models\Loan;
use App\Models\Occurrence;
use App\Models\Series;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AccountController extends FinanceController
{
    public function schedules(Request $r, string $id, CardSchedules $service): mixed
    {
        return $this->change($r, function () use ($r, $id, $service) {
            $account = Account::where('type', 'credit_card')->findOrFail($id);
            $this->version($r, $account);
            $v = $r->validate(['purpose' => 'required|in:statement,fee', 'enabled' => 'required|boolean', 'first_date' => 'nullable|date_format:Y-m-d', 'recipient_ids' => 'array', 'recipient_ids.*' => 'uuid']);
            $this->relations($v);
            $service->configure($account, $v['purpose'], (bool) $v['enabled'], $v['first_date'] ?? null, $v['recipient_ids'] ?? []);
            $account->increment('lock_version');

            return $account;
        }, 'Card schedule updated.');
    }

    public function index(Request $r)
    {
        $records = Account::orderBy('type')->orderBy('name')->get()->map(function ($a) {
            $limit = CreditLimit::where('account_id', $a->id)->where('effective_date', '<=', now('UTC')->toDateString())->latest('effective_date')->first();
            $loan = Loan::where('account_id', $a->id)->first();

            $generated = Series::where('generated_by_account_id', $a->id)->get()->map(fn ($s) => [...$s->toArray(), 'next_date' => Occurrence::where('series_id', $s->id)->where('status', 'unpaid')->orderBy('due_date')->value('due_date')]);

            return [...$a->toArray(), 'generated_schedules' => $generated, 'limit_cents' => $limit?->limit_cents === null ? null : (string) $limit->limit_cents, 'loan' => $loan ? [...$loan->toArray(), 'paid_cents' => (string) app(Loans::class)->paid($loan)] : null];
        });
        $totals = ['cash_cents' => 0, 'investments_cents' => 0, 'cards_cents' => 0, 'loans_cents' => 0];
        foreach ($records as $a) {
            $totals[match ($a['type']) {
                'investment' => 'investments_cents','credit_card' => 'cards_cents','loan' => 'loans_cents',default => 'cash_cents'
            }] += (int) $a['balance_cents'];
        }
        $totals['net_cents'] = $totals['cash_cents'] + $totals['investments_cents'] - $totals['cards_cents'] - $totals['loans_cents'];
        $totals['unknown_count'] = $records->whereNull('balance_cents')->count();

        return Inertia::render('Finance/Index', ['section' => 'accounts', 'records' => $records, 'summary' => array_map('strval', $totals), 'catalog' => $this->catalog(),
            'history' => BalanceEvent::orderBy('effective_date')->orderBy('created_at')->get(), 'limits' => CreditLimit::orderBy('effective_date')->get()]);
    }

    private function values(Request $r, bool $create): array
    {
        $v = $r->validate(['name' => 'required|string|max:120', 'type' => ($create ? 'required' : 'sometimes').'|in:cash,checking,savings,credit_card',
            'institution_name' => 'nullable|string|max:120', 'notes' => 'nullable|string|max:4000', 'member_id' => 'nullable|uuid',
            'balance' => ($create ? 'required' : 'sometimes').'|string', 'balance_date' => ($create ? 'required' : 'sometimes').'|date_format:Y-m-d',
            'apr' => 'nullable|numeric|min:0|max:1000', 'fee' => 'nullable|string', 'fee_cadence' => 'nullable|in:monthly,yearly',
            'statement_day' => 'nullable|integer|between:1,31', 'due_day' => 'nullable|integer|between:1,31',
            'usual_paying_account_id' => 'nullable|uuid', 'next_fee_date' => 'nullable|date_format:Y-m-d']);
        $this->relations($v);
        if (isset($v['usual_paying_account_id'])) {
            Account::findOrFail($v['usual_paying_account_id']);
        }
        if (isset($v['balance'])) {
            $v['balance_cents'] = Money::parse($v['balance'], true);
            unset($v['balance']);
        }
        if (! empty($v['fee'])) {
            $v['fee_cents'] = Money::parse($v['fee']);
            unset($v['fee']);
        } else {
            $v['fee_cents'] = null;
            unset($v['fee']);
        }

        return $v;
    }

    private function cardConfiguration(Request $r, Account $account): void
    {
        if ($account->type !== 'credit_card') {
            return;
        }
        $v = $r->validate(['limit' => 'nullable|string', 'limit_date' => 'nullable|date_format:Y-m-d', 'statement_enabled' => 'sometimes|boolean', 'fee_enabled' => 'sometimes|boolean', 'first_statement_date' => 'nullable|date_format:Y-m-d']);
        if ($r->filled('limit')) {
            $limit = CreditLimit::updateOrCreate(['account_id' => $account->id, 'effective_date' => $v['limit_date'] ?? $account->balance_date ?? now('UTC')->toDateString()], ['limit_cents' => Money::parse($v['limit'])]);
            Audit::record($limit, 'limit_recorded');
        }
        foreach (['statement', 'fee'] as $purpose) {
            if (array_key_exists($purpose.'_enabled', $v)) {
                app(CardSchedules::class)->configure($account, $purpose, $v[$purpose.'_enabled'], $purpose === 'statement' ? ($v['first_statement_date'] ?? null) : $account->next_fee_date);
            }
        }
    }

    public function store(Request $r)
    {
        return $this->change($r, function () use ($r) {
            $v = $this->values($r, true);
            $a = Account::create([...$v, 'source' => 'manual', 'balance_observed_at' => now()]);
            BalanceEvent::create(['account_id' => $a->id, 'kind' => 'opening', 'balance_cents' => $a->balance_cents, 'effective_date' => $a->balance_date]);
            $this->cardConfiguration($r, $a);
            Audit::record($a, 'created');

            return $a;
        }, 'Account created.');
    }

    public function update(Request $r, string $id)
    {
        return $this->change($r, function () use ($r, $id) {
            $a = Account::findOrFail($id);
            $this->version($r, $a);
            $v = $this->values($r, false);
            unset($v['type'],$v['balance_cents'],$v['balance_date']);
            $before = $a->toArray();
            $a->update([...$v, 'lock_version' => $a->lock_version + 1]);
            $this->cardConfiguration($r, $a);
            Audit::record($a, 'edited', $before);

            return $a;
        });
    }

    public function balance(Request $r, string $id)
    {
        return $this->change($r, function () use ($r, $id) {
            $a = Account::where('source', 'manual')->findOrFail($id);
            $this->version($r, $a);
            $v = $r->validate(['balance' => 'required|string', 'balance_date' => 'required|date_format:Y-m-d|before_or_equal:today']);
            $loan = Loan::where('account_id', $id)->first();
            if ($loan?->series_id) {
                throw ValidationException::withMessages(['balance' => 'Adjust the repayment base in Loans so payments are not counted twice.']);
            }$before = $a->toArray();
            $cents = Money::parse($v['balance'], true);
            BalanceEvent::create(['account_id' => $id, 'kind' => 'manual_update', 'balance_cents' => $cents, 'effective_date' => $v['balance_date']]);
            if ($v['balance_date'] >= ($a->balance_date ?? '0000-00-00')) {
                $a->update(['balance_cents' => $cents, 'balance_date' => $v['balance_date'], 'balance_observed_at' => now(), 'lock_version' => $a->lock_version + 1]);
            } else {
                $a->increment('lock_version');
            }
            Audit::record($a, 'balance_updated', $before);

            return $a;
        }, 'Balance recorded. No transaction was created.');
    }

    public function limit(Request $r, string $id)
    {
        return $this->change($r, function () use ($r, $id) {
            $a = Account::where('type', 'credit_card')->findOrFail($id);
            $this->version($r, $a);
            $v = $r->validate(['limit' => 'required|string', 'effective_date' => 'required|date_format:Y-m-d', 'note' => 'nullable|string|max:500']);
            $before = CreditLimit::where('account_id', $id)->where('effective_date', $v['effective_date'])->first()?->toArray() ?? [];
            $e = CreditLimit::updateOrCreate(['account_id' => $id, 'effective_date' => $v['effective_date']], ['limit_cents' => Money::parse($v['limit']), 'note' => $v['note'] ?? null]);
            Audit::record($e, $before ? 'limit_corrected' : 'limit_recorded', $before);
            $a->increment('lock_version');

            return $e;
        }, 'Credit limit recorded.');
    }

    public function detail(Request $r, string $id)
    {
        $r->validate(['search' => 'nullable|string|max:200', 'timeline_page' => 'nullable|integer|min:1']);
        $a = Account::findOrFail($id);
        $transactions = Transaction::where('account_id', $id)->when(! $r->boolean('show_hidden'), fn ($q) => $q->where('hidden', false))->when($r->filled('search'), fn ($q) => $q->where('payee', 'ilike', '%'.$r->input('search').'%'));
        $balances = BalanceEvent::where('account_id', $id)->orderBy('effective_date')->orderBy('created_at')->get();
        $size = $this->pageSize($r);
        $transactionRows = (clone $transactions)->selectRaw("id, payee, transaction_date as date, amount_cents, status, hidden, category_id, created_at, 'transaction' as entry_type, null::text as kind, null::bigint as balance_cents")
            ->selectSub(BalanceEvent::where('account_id', $id)->whereColumn('transaction_id', 'transactions.id')->latest()->select('delta_cents')->limit(1), 'delta_cents')->toBase();
        $balanceRows = BalanceEvent::where('account_id', $id)->where('kind', '!=', 'transaction')
            ->when($r->filled('search'), fn ($q) => $q->whereRaw('1=0'))
            ->selectRaw("id, null::text as payee, effective_date as date, null::bigint as amount_cents, null::text as status, false as hidden, null::uuid as category_id, created_at, 'balance' as entry_type, kind, balance_cents, delta_cents")->toBase();
        $timeline = DB::query()->fromSub($transactionRows->unionAll($balanceRows), 'activity')->orderByDesc('date')->orderByDesc('created_at')->orderBy('id')->paginate($size, ['*'], 'timeline_page')->withQueryString();
        $timeline->through(function ($row) {
            $values = (array) $row;
            foreach (['amount_cents', 'balance_cents', 'delta_cents'] as $field) {
                $values[$field] = $values[$field] === null ? null : (string) $values[$field];
            }

            return $values;
        });

        $generated = Series::where('generated_by_account_id', $id)->get()->map(fn ($s) => [...$s->toArray(), 'next_date' => Occurrence::where('series_id', $s->id)->where('status', 'unpaid')->orderBy('due_date')->value('due_date')]);

        $detail = ['account' => $a, 'loan_id' => Loan::where('account_id', $id)->value('id'), 'transactions' => $transactions->latest('transaction_date')->orderBy('id')->paginate($size)->withQueryString(), 'timeline' => $timeline, 'balances' => $balances, 'limits' => CreditLimit::where('account_id', $id)->orderByDesc('effective_date')->get(), 'connection' => $a->connection_id ? Connection::find($a->connection_id) : null, 'generated_schedules' => $generated];

        return $r->expectsJson() ? response()->json($detail) : Inertia::render('Finance/AccountShow', ['detail' => $detail, 'catalog' => $this->catalog()]);
    }

    public function destroy(Request $r, string $id)
    {
        $this->change($r, function () use ($r, $id) {
            $a = Account::findOrFail($id);
            $this->version($r, $a);
            abort_if($a->type === 'loan', 422, 'Remove loans from the Loans page.');
            $before = $a->toArray();
            if ($a->type === 'credit_card') {
                app(CardSchedules::class)->configure($a, 'statement', false, null);
                app(CardSchedules::class)->configure($a, 'fee', false, null);
            }
            $a->delete();
            foreach (Series::all() as $s) {
                if (in_array($id, $s->account_ids ?? [])) {
                    $s->update(['account_ids' => array_values(array_diff($s->account_ids, [$id]))]);
                }
            }foreach (Occurrence::all() as $o) {
                if (in_array($id, $o->account_ids ?? [])) {
                    $o->update(['account_ids' => array_values(array_diff($o->account_ids, [$id]))]);
                }
            }Audit::record($a, 'deleted', $before);

            return $a;
        }, 'Account removed; financial history is retained.');

        return redirect()->route('accounts');
    }
}
