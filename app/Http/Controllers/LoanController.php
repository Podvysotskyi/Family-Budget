<?php

namespace App\Http\Controllers;

use App\Domain\History\Audit;
use App\Domain\Loans\Loans;
use App\Domain\Loans\LoanTerms;
use App\Domain\Scheduling\Recurrence;
use App\Domain\Shared\Money;
use App\Models\Account;
use App\Models\BalanceEvent;
use App\Models\Category;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\Occurrence;
use App\Models\Series;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LoanController extends FinanceController
{
    public function index(Request $r, Loans $service)
    {
        $assignment = $this->assignment($r);
        $r->validate(['loan' => 'nullable|uuid']);
        $query = Loan::whereHas('account', fn ($q) => $this->filterAssignment($q, $assignment)->when(! $r->boolean('show_paid'), fn ($q) => $q->where('balance_cents', '!=', 0)));
        $page = null;
        if ($r->filled('loan') && ! $r->has('page')) {
            $selected = (clone $query)->findOrFail($r->input('loan'));
            $preceding = (clone $query)->where(fn ($before) => $before->where('created_at', '<', $selected->created_at)->orWhere(fn ($sameTime) => $sameTime->where('created_at', $selected->created_at)->where('id', '<', $selected->id)))->count();
            $page = intdiv($preceding, $this->pageSize($r)) + 1;
        }
        $records = $query->orderBy('created_at')->orderBy('id')->paginate($this->pageSize($r), ['*'], 'page', $page)->withQueryString()->through(function ($loan) use ($service) {
            $a = Account::findOrFail($loan->account_id);

            return [...$loan->toArray(), 'account' => $a->toArray(), 'series' => $loan->series_id ? Series::find($loan->series_id)?->toArray() : null, 'paid_cents' => (string) $service->paid($loan), 'next' => $loan->series_id ? Occurrence::where('series_id', $loan->series_id)->where('status', 'unpaid')->orderBy('slot_order')->first()?->toArray() : null];
        });

        return Inertia::render('Finance/Index', ['section' => 'loans', 'records' => $records, 'catalog' => $this->catalog(), 'filters' => $r->only(['show_paid', 'assignment'])]);
    }

    public function preview(Request $r, Recurrence $recurrence): mixed
    {
        $v = $r->validate(['balance' => 'required|string', 'installment' => 'required|string', 'frequency' => 'required|in:weekly,biweekly,monthly,twice_monthly,yearly', 'first_date' => 'required|date_format:Y-m-d', 'day_one' => 'nullable|integer|between:1,31', 'day_two' => 'required_if:frequency,twice_monthly|nullable|integer|between:1,31|different:day_one']);
        $remaining = Money::parse($v['balance']);
        $installment = Money::parse($v['installment']);
        abort_if($installment <= 0, 422, 'Installment must be positive.');
        $rows = [];
        foreach ($recurrence->slots($v, now($r->user()->timezone)->toDateString()) as $slot) {
            if ($remaining <= 0 || count($rows) >= 500) {
                break;
            }
            $amount = min($installment, $remaining);
            $remaining -= $amount;
            $rows[] = [...$slot, 'amount_cents' => (string) $amount];
        }

        return response()->json(['payments' => $rows]);
    }

    public function store(Request $r, Loans $service)
    {
        return $this->change($r, function () use ($r, $service) {
            $v = $r->validate(['name' => 'required|string|max:120', 'lender' => 'nullable|string|max:120', 'notes' => 'nullable|string|max:4000', 'balance' => 'required|string', 'balance_date' => 'required|date_format:Y-m-d', 'scheduled' => 'boolean', 'installment' => 'nullable|string', 'frequency' => 'required|in:weekly,biweekly,monthly,twice_monthly,yearly', 'first_date' => 'required|date_format:Y-m-d', 'day_one' => 'nullable|integer|between:1,31', 'day_two' => 'nullable|integer|between:1,31', 'account_ids' => 'array', 'account_ids.*' => 'uuid', 'recipient_ids' => 'array', 'recipient_ids.*' => 'uuid', 'member_id' => 'nullable|uuid', 'past_payments' => 'array|max:500', 'past_payments.*.amount' => 'required|string', 'past_payments.*.date' => 'required|date_format:Y-m-d|before_or_equal:today', 'past_payments.*.due_date' => 'nullable|date_format:Y-m-d|before_or_equal:today', 'past_payments.*.slot_key' => 'nullable|string|distinct|max:30']);
            $this->relations($v);
            $total = Money::parse($v['balance']);
            $scheduled = $r->boolean('scheduled');
            if ($scheduled && $v['frequency'] === 'twice_monthly' && (empty($v['day_one']) || empty($v['day_two']) || $v['day_one'] == $v['day_two'])) {
                throw ValidationException::withMessages(['day_two' => 'Choose two different days of the month.']);
            }
            $a = Account::create(['name' => $v['name'], 'type' => 'loan', 'source' => 'manual', 'balance_cents' => $total, 'balance_date' => $v['balance_date'], 'institution_name' => $v['lender'] ?? null, 'notes' => $v['notes'] ?? null, 'member_id' => $v['member_id'] ?? null]);
            $s = null;
            $installment = $scheduled ? Money::parse($v['installment'] ?? '0') : null;
            if ($scheduled && $installment <= 0) {
                throw ValidationException::withMessages(['installment' => 'Enter a positive installment.']);
            }if ($scheduled) {
                $s = Series::create(['kind' => 'loan_installment', 'name' => $a->name, 'amount_cents' => $installment, 'frequency' => $v['frequency'], 'first_date' => $v['first_date'], 'day_one' => $v['day_one'] ?? null, 'day_two' => $v['day_two'] ?? null, 'account_ids' => $v['account_ids'] ?? [], 'recipient_ids' => $v['recipient_ids'] ?? [], 'member_id' => $v['member_id'] ?? null, 'category_id' => Category::where('system_key', 'loan_payments')->value('id')]);
            }$loan = Loan::create(['account_id' => $a->id, 'series_id' => $s?->id, 'tracking_mode' => $scheduled ? 'full' : 'balance', 'repayment_total_cents' => $scheduled ? $total : null, 'installment_cents' => $installment, 'lender' => $v['lender'] ?? null, 'notes' => $v['notes'] ?? null]);
            $slots = $s ? collect(app(Recurrence::class)->slots($s->toArray(), now($r->user()->timezone)->toDateString()))->keyBy('key') : collect();
            $usedSlots = [];
            foreach ($v['past_payments'] ?? [] as $p) {
                if (! $scheduled) {
                    throw ValidationException::withMessages(['past_payments' => 'Enable a repayment schedule to track past payments.']);
                }
                $amount = Money::parse($p['amount']);
                if ($amount <= 0 || $service->paid($loan) + $amount > $total) {
                    throw ValidationException::withMessages(['past_payments' => 'Past payments must be positive and cannot exceed the repayment total.']);
                }
                $occurrence = null;
                if (! empty($p['due_date'])) {
                    $matches = $slots->where('date', $p['due_date']);
                    $slot = ! empty($p['slot_key']) ? $slots->get($p['slot_key']) : ($matches->count() === 1 ? $matches->first() : null);
                    if (! $slot || $slot['date'] !== $p['due_date'] || in_array($slot['key'], $usedSlots)) {
                        throw ValidationException::withMessages(['past_payments' => 'Choose a past due date from this repayment schedule.']);
                    }
                    $usedSlots[] = $slot['key'];
                    $occurrence = Occurrence::create(['series_id' => $s->id, 'generation_key' => $slot['key'], 'slot_order' => $slot['slot'], 'due_date' => $slot['date'], 'kind' => 'loan_installment', 'name' => $a->name, 'amount_cents' => $amount, 'status' => 'paid', 'completed_date' => $p['date'], 'account_ids' => $s->account_ids, 'recipient_ids' => $s->recipient_ids, 'member_id' => $s->member_id, 'category_id' => $s->category_id]);
                }
                LoanPayment::create(['loan_id' => $loan->id, 'occurrence_id' => $occurrence?->id, 'kind' => $occurrence ? 'installment' : 'past_payment', 'amount_cents' => $amount, 'payment_date' => $p['date']]);
            }BalanceEvent::create(['account_id' => $a->id, 'kind' => 'opening', 'balance_cents' => $total, 'effective_date' => $a->balance_date]);
            if ($scheduled) {
                $service->rebuild($loan);
            }Audit::record($loan, 'created');

            return $loan;
        }, 'Loan created.');
    }

    public function update(Request $r, string $id, LoanTerms $service): mixed
    {
        return $this->change($r, function () use ($r, $id, $service) {
            $loan = Loan::findOrFail($id);
            $this->version($r, $loan);
            $v = $r->validate(['name' => 'required|string|max:120', 'repayment_total' => 'nullable|string', 'installment' => 'nullable|string', 'balance' => 'nullable|string', 'balance_date' => 'nullable|date_format:Y-m-d', 'scheduled' => 'sometimes|boolean', 'first_date' => 'nullable|date_format:Y-m-d', 'frequency' => 'nullable|in:weekly,biweekly,monthly,twice_monthly,yearly', 'day_one' => 'nullable|integer|between:1,31', 'day_two' => 'nullable|integer|between:1,31', 'account_ids' => 'array', 'account_ids.*' => 'uuid', 'recipient_ids' => 'array', 'recipient_ids.*' => 'uuid', 'member_id' => 'nullable|uuid', 'lender' => 'nullable|string|max:120', 'notes' => 'nullable|string|max:4000', 'scope' => 'nullable|in:occurrence,future', 'anchor_id' => 'nullable|uuid']);
            $this->relations($v);
            $service->update($loan, $v);

            return $loan;
        });
    }

    public function extra(Request $r, string $id, Loans $service)
    {
        return $this->change($r, function () use ($r, $id, $service) {
            $loan = Loan::findOrFail($id);
            abort_unless($loan->series_id, 422, 'Enable a repayment schedule to record payments.');
            $v = $r->validate(['amount' => 'required|string', 'payment_date' => 'required|date_format:Y-m-d|before_or_equal:today', 'account_ids' => 'array', 'account_ids.*' => 'uuid']);
            $this->relations($v);

            return $service->pay($loan, Money::parse($v['amount']), $v['payment_date'], null, $v['account_ids'] ?? []);
        }, 'Extra payment recorded.');
    }

    public function payment(Request $r, string $id, Loans $service)
    {
        return $this->change($r, function () use ($r, $id, $service) {
            $p = LoanPayment::whereIn('kind', ['extra', 'past_payment'])->findOrFail($id);
            $this->version($r, $p);
            $loan = Loan::findOrFail($p->loan_id);
            $before = $p->toArray();
            if ($r->isMethod('DELETE')) {
                $p->delete();
            } else {
                $v = $r->validate(['amount' => 'required|string', 'payment_date' => 'required|date_format:Y-m-d|before_or_equal:today', 'account_ids' => 'sometimes|array', 'account_ids.*' => 'uuid']);
                $this->relations($v);
                $amount = Money::parse($v['amount']);
                if ($amount <= 0 || $amount > (int) $loan->repayment_total_cents - $service->paid($loan) + (int) $p->amount_cents) {
                    throw ValidationException::withMessages(['amount' => 'Payment cannot exceed the remaining balance.']);
                }$p->update(['amount_cents' => $amount, 'payment_date' => $v['payment_date'], 'account_ids' => $v['account_ids'] ?? $p->account_ids, 'lock_version' => $p->lock_version + 1]);
            }Audit::record($p, 'corrected', $before);
            $service->rebuild($loan, 'payment_correction');

            return $p;
        });
    }

    public function detail(Request $r, string $id, Loans $service)
    {
        $loan = Loan::findOrFail($id);

        $projection = $service->projection($loan);

        return response()->json(['loan' => $loan, 'series' => $loan->series_id ? Series::find($loan->series_id) : null, 'account' => Account::findOrFail($loan->account_id), 'summary' => ['paid_cents' => (string) $service->paid($loan), 'remaining_count' => count($projection), 'next_date' => $projection[0]['due_date'] ?? null, 'final_date' => $projection ? $projection[array_key_last($projection)]['due_date'] : null], 'balances' => BalanceEvent::where('account_id', $loan->account_id)->orderBy('effective_date')->orderBy('created_at')->get(), 'scheduled' => $projection, 'payments' => LoanPayment::where('loan_id', $id)->whereNull('reversed_at')->latest('payment_date')->orderBy('id')->paginate($this->pageSize($r), ['*'], 'payments_page')->withQueryString(), 'installments' => $loan->series_id ? Occurrence::where('series_id', $loan->series_id)->orderBy('slot_order')->paginate($this->pageSize($r), ['*'], 'installments_page')->withQueryString() : null]);
    }

    public function destroy(Request $r, string $id)
    {
        return $this->change($r, function () use ($r, $id) {
            $loan = Loan::findOrFail($id);
            $this->version($r, $loan);
            $before = $loan->toArray();
            if ($loan->series_id) {
                foreach (Occurrence::where('series_id', $loan->series_id)->get() as $o) {
                    $o->delete();
                }Series::find($loan->series_id)?->delete();
            }Account::find($loan->account_id)?->delete();
            $loan->delete();
            Audit::record($loan, 'deleted', $before);

            return $loan;
        }, 'Loan removed; payment history is retained.');
    }
}
