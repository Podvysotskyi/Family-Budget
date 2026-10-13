<?php

namespace App\Http\Controllers;

use App\Domain\History\Audit;
use App\Domain\History\HistoryValues;
use App\Domain\Shared\Money;
use App\Models\Account;
use App\Models\Attachment;
use App\Models\AuditEvent;
use App\Models\BalanceEvent;
use App\Models\Category;
use App\Models\CreditLimit;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\Occurrence;
use App\Models\Series;
use App\Models\Transaction;
use App\Support\HouseholdContext;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class TransactionController extends FinanceController
{
    public function detail(Request $r, string $id): mixed
    {
        $transaction = Transaction::findOrFail($id);
        $links = Attachment::where('transaction_id', $id)->whereNull('detached_at')->get()->map(fn ($a) => [...$a->toArray(), 'occurrence' => Occurrence::find($a->occurrence_id)]);

        return response()->json(['transaction' => $transaction, 'attachments' => $links, 'balance_effect' => BalanceEvent::where('transaction_id', $id)->first()]);
    }

    public function occurrences(Request $r, string $id): mixed
    {
        $transaction = Transaction::findOrFail($id);
        $r->validate(['search' => 'nullable|string|max:200']);

        return response()->json(Occurrence::when($r->filled('search'), fn ($q) => $q->where('name', 'ilike', '%'.$r->input('search').'%'))->orderByRaw('ABS(due_date - ?::date)', [$transaction->transaction_date])->orderBy('slot_order')->paginate($this->pageSize($r))->withQueryString());
    }

    public function index(Request $r)
    {
        $r->validate(['account' => 'nullable|uuid', 'category' => 'nullable|string|max:80', 'search' => 'nullable|string|max:200']);
        $q = Transaction::whereIn('account_id', Account::pluck('id'))->orderByDesc('transaction_date')->orderBy('id');
        if (! $r->boolean('show_hidden')) {
            $q->where('hidden', false);
        }
        if ($r->filled('search')) {
            $q->where('payee', 'ilike', '%'.$r->input('search').'%');
        }
        if ($r->filled('account')) {
            $q->where('account_id', $r->input('account'));
        }
        if ($r->filled('category')) {
            if ($r->input('category') === 'uncategorized') {
                $q->whereNull('category_id');
            } else {
                $r->validate(['category' => 'uuid']);
                $category = Category::findOrFail($r->input('category'));
                $q->whereIn('category_id', [$category->id, ...Category::where('parent_id', $category->id)->pluck('id')->all()]);
            }
        }

        return Inertia::render('Finance/Index', ['section' => 'transactions', 'records' => $q->paginate($this->pageSize($r))->withQueryString(), 'catalog' => $this->catalog(), 'filters' => $r->only(['search', 'account', 'category', 'show_hidden'])]);
    }

    public function store(Request $r)
    {
        return $this->change($r, function () use ($r) {
            $v = $r->validate(['account_id' => 'required|uuid', 'payee' => 'required|string|max:200', 'amount' => 'required|string', 'direction' => 'required|in:in,out', 'transaction_date' => 'required|date_format:Y-m-d', 'category_id' => 'nullable|uuid', 'notes' => 'nullable|string|max:4000', 'update_balance' => 'boolean']);
            $this->relations($v);
            $a = Account::where('source', 'manual')->findOrFail($v['account_id']);
            $amount = Money::parse($v['amount']) * ($v['direction'] === 'out' ? -1 : 1);
            if (! $amount) {
                throw ValidationException::withMessages(['amount' => 'Amount must be greater than zero.']);
            }unset($v['amount'],$v['direction'],$v['update_balance']);
            $t = Transaction::create([...$v, 'amount_cents' => $amount, 'source' => 'manual']);
            if ($r->boolean('update_balance', true)) {
                if (Loan::where('account_id', $a->id)->whereNotNull('series_id')->exists()) {
                    throw ValidationException::withMessages(['update_balance' => 'Record the payment in Loans to avoid changing the balance twice.']);
                }
                $delta = in_array($a->type, ['credit_card', 'loan']) ? -$amount : $amount;
                $balance = (int) $a->balance_cents + $delta;
                $a->update(['balance_cents' => $balance, 'balance_date' => now('UTC')->toDateString(), 'balance_observed_at' => now(), 'lock_version' => $a->lock_version + 1]);
                BalanceEvent::create(['account_id' => $a->id, 'kind' => 'transaction', 'balance_cents' => $balance, 'delta_cents' => $delta, 'effective_date' => now('UTC')->toDateString(), 'transaction_id' => $t->id]);
            }Audit::record($t, 'created');

            return $t;
        }, 'Transaction created.');
    }

    public function update(Request $r, string $id)
    {
        return $this->change($r, function () use ($r, $id) {
            $t = Transaction::findOrFail($id);
            $this->version($r, $t);
            $v = $r->validate(['notes' => 'nullable|string|max:4000', 'category_id' => 'nullable|uuid', 'manual_classification' => 'nullable|in:ordinary,transfer,card_repayment,investment_purchase,investment_sale', 'payee' => 'sometimes|string|max:200', 'amount' => 'sometimes|string', 'direction' => 'sometimes|in:in,out', 'transaction_date' => 'sometimes|date_format:Y-m-d']);
            $this->relations($v);
            $before = $t->toArray();
            if ($t->source === 'provider' && array_intersect(array_keys($v), ['payee', 'amount', 'transaction_date'])) {
                throw ValidationException::withMessages(['payee' => 'Imported amount, date and payee are read-only.']);
            }if (isset($v['amount'])) {
                $v['amount_cents'] = Money::parse($v['amount']) * (($v['direction'] ?? 'out') === 'out' ? -1 : 1);
                unset($v['amount'],$v['direction']);
            }unset($v['direction']);
            if (isset($v['amount_cents']) && $v['amount_cents'] === 0) {
                throw ValidationException::withMessages(['amount' => 'Amount must be greater than zero.']);
            }if (array_key_exists('category_id', $v)) {
                $v['category_origin'] = 'member';
            }$t->update([...$v, 'lock_version' => $t->lock_version + 1]);
            Audit::record($t, 'edited', $before);

            return $t;
        }, 'Saved. The previous balance effect is unchanged.');
    }

    public function hide(Request $r, string $id)
    {
        return $this->change($r, function () use ($r, $id) {
            $t = Transaction::findOrFail($id);
            $before = $t->toArray();
            $t->update(['hidden' => $r->boolean('hidden'), 'lock_version' => $t->lock_version + 1]);
            Audit::record($t, $t->hidden ? 'hidden' : 'unhidden', $before);

            return $t;
        });
    }

    public function destroy(Request $r, string $id)
    {
        return $this->change($r, function () use ($r, $id) {
            $t = Transaction::findOrFail($id);
            $this->version($r, $t);
            $before = $t->toArray();
            $t->update(['deletion_reason' => 'member']);
            $t->delete();
            Audit::record($t, 'deleted', $before);

            return $t;
        }, 'Transaction deleted. Balance effects and history are retained.');
    }

    public function search(Request $r, string $id)
    {
        Occurrence::findOrFail($id);
        $q = Transaction::query()->orderByDesc('transaction_date');
        if (! $r->boolean('show_hidden')) {
            $q->where('hidden', false);
        }if ($r->filled('search')) {
            $q->where('payee', 'ilike', '%'.$r->input('search').'%');
        }

        $records = $q->paginate($this->pageSize($r))->withQueryString();
        $claims = Attachment::whereIn('transaction_id', $records->pluck('id'))->where('active_claim', true)->whereNull('detached_at')->get()->keyBy('transaction_id');
        $records->getCollection()->transform(fn ($t) => [...$t->toArray(), 'attached_occurrence_id' => $claims->get($t->id)?->occurrence_id]);

        return response()->json($records);
    }

    public function attach(Request $r, string $id)
    {
        return $this->change($r, function () use ($r, $id) {
            $o = Occurrence::findOrFail($id);
            $v = $r->validate(['transaction_id' => 'required|uuid']);
            $t = Transaction::findOrFail($v['transaction_id']);
            $link = Attachment::where('transaction_id', $t->id)->where('active_claim', true)->whereNull('detached_at')->first();
            if ($link) {
                abort_unless($link->occurrence_id === $o->id, 409, 'Transaction is attached to another payment.');

                return $link;
            }$a = Attachment::create(['occurrence_id' => $o->id, 'transaction_id' => $t->id, 'linked_by_member_id' => app(HouseholdContext::class)->memberId]);
            Audit::record($a, 'attached');

            return $a;
        }, 'Transaction attached. Payment amount and status are unchanged.');
    }

    public function detach(Request $r, string $id)
    {
        return $this->change($r, function () use ($id) {
            $a = Attachment::findOrFail($id);
            $before = $a->toArray();
            $a->update(['detached_at' => now(), 'active_claim' => false]);
            Audit::record($a, 'detached', $before);

            return $a;
        }, 'Attachment removed.');
    }

    public function history(Request $r, string $type, string $id)
    {
        $models = ['transactions' => Transaction::class, 'accounts' => Account::class, 'occurrences' => Occurrence::class, 'scheduled_series' => Series::class, 'loans' => Loan::class, 'categories' => Category::class];
        abort_unless(isset($models[$type]), 404);
        $record = $models[$type]::withTrashed()->findOrFail($id);
        $events = AuditEvent::where(function ($query) use ($type, $id, $record) {
            $query->where(fn ($subject) => $subject->where('subject_type', $type)->where('subject_id', $id));
            if ($type === 'accounts') {
                $query->orWhere(fn ($limits) => $limits->where('subject_type', 'credit_limit_entries')->whereIn('subject_id', CreditLimit::where('account_id', $id)->select('id')));
            }
            if ($type === 'loans') {
                $query->orWhere(fn ($payments) => $payments->where('subject_type', 'loan_payments')->whereIn('subject_id', LoanPayment::withTrashed()->where('loan_id', $id)->select('id')));
                $query->orWhere(fn ($account) => $account->where('subject_type', 'accounts')->where('subject_id', $record->account_id));
            }
        })->latest()->orderByDesc('id')->paginate($this->pageSize($r))->withQueryString();
        if ($type === 'transactions' && $record->deleted_at) {
            $events->getCollection()->transform(fn ($e) => ['action' => $e->action, 'actor_name' => $e->actor_name, 'created_at' => $e->created_at, 'changes' => ['record' => ['old' => 'A deleted transaction', 'new' => 'A deleted transaction']]]);
        } else {
            $events->through(fn ($event) => app(HistoryValues::class)->present($event));
        }

        return response()->json($events);
    }
}
