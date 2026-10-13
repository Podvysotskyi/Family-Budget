<?php

namespace App\Http\Controllers;

use App\Domain\History\Audit;
use App\Domain\History\HistoryValues;
use App\Domain\Loans\Loans;
use App\Domain\Scheduling\Recurrence;
use App\Domain\Scheduling\Schedules;
use App\Domain\Shared\Money;
use App\Domain\Transactions\Matching;
use App\Models\Account;
use App\Models\Attachment;
use App\Models\AuditEvent;
use App\Models\Category;
use App\Models\Household;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\Member;
use App\Models\Occurrence;
use App\Models\Series;
use App\Models\Transaction;
use Carbon\CarbonImmutable as Date;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ScheduleController extends FinanceController
{
    public function home(Request $r, Schedules $schedules)
    {
        $assignment = $this->assignment($r);
        $month = $r->validate(['month' => 'nullable|date_format:Y-m'])['month'] ?? now('UTC')->format('Y-m');
        $first = Date::parse($month.'-01');
        $start = $first->startOfWeek();
        $end = $first->endOfMonth()->endOfWeek();
        foreach (Series::where('kind', '!=', 'loan_installment')->get() as $series) {
            $schedules->materialize($series, $end->toDateString());
        }
        $items = $this->filterAssignment(Occurrence::whereBetween('due_date', [$start->toDateString(), $end->toDateString()]), $assignment)->orderBy('due_date')->orderBy('slot_order')->get();
        $totals = fn ($set) => ['income_cents' => (string) $set->where('kind', 'income')->sum('amount_cents'),
            'due_cents' => (string) $set->where('kind', '!=', 'income')->sum('amount_cents'),
            'paid_cents' => (string) $set->where('kind', '!=', 'income')->where('status', 'paid')->sum('amount_cents'),
            'unpaid_cents' => (string) $set->where('kind', '!=', 'income')->where('status', 'unpaid')->sum('amount_cents'),
            'unknown_count' => $set->whereNull('amount_cents')->count()];
        $weeks = [];
        for ($day = $start; $day <= $end; $day = $day->addWeek()) {
            $weeks[] = ['start' => $day->toDateString(), ...$totals($items->filter(fn ($i) => $i->due_date >= $day->toDateString() && $i->due_date <= $day->addDays(6)->toDateString()))];
        }

        return Inertia::render('Finance/Index', ['section' => 'home', 'month' => $month, 'calendarStart' => $start->toDateString(),
            'filters' => $r->only('assignment'),
            'records' => $items, 'summary' => $totals($items->filter(fn ($i) => str_starts_with($i->due_date, $month))), 'weeks' => $weeks, 'catalog' => $this->catalog(),
            'setup' => $r->attributes->get('household')->setup_dismissed_at ? null : ['accounts' => Account::exists(), 'bills' => Series::where('kind', 'bill')->exists(), 'members' => Member::where('household_id', $r->attributes->get('household')->id)->count() > 1]]);
    }

    public function index(Request $r, string $kind = 'bill')
    {
        $assignment = $this->assignment($r);
        $r->validate(['kind' => 'nullable|in:all,bill,income', 'search' => 'nullable|string|max:200']);
        if ($kind === 'bill' && $r->input('kind') === 'income') {
            return redirect()->route('income', $r->except('kind'));
        }
        $q = Series::where('kind', $kind)->orderBy('name');
        if ($r->filled('search')) {
            $term = '%'.$r->input('search').'%';
            $q->where(fn ($q) => $q->where('name', 'ilike', $term)->orWhereExists(fn ($occurrences) => $occurrences->selectRaw('1')->from('occurrences')->whereColumn('occurrences.series_id', 'scheduled_series.id')->whereNull('occurrences.deleted_at')->where('occurrences.name', 'ilike', $term)));
        }
        if ($kind === 'subscription' && ! $r->boolean('show_canceled')) {
            $q->where(fn ($q) => $q->whereNull('cancel_date')->orWhere('cancel_date', '>', now($r->user()->timezone)->toDateString()));
        }
        $records = $this->filterSeriesAssignment($q, $assignment)->paginate($this->pageSize($r))->withQueryString();
        $records->getCollection()->transform(function ($series) {
            $next = Occurrence::where('series_id', $series->id)->whereIn('status', ['unpaid', 'not_received'])->orderBy('due_date')->first();

            $anchor = $next ?? Occurrence::where('series_id', $series->id)->latest('due_date')->first();

            return [...$series->toArray(), ...($anchor ? array_intersect_key($anchor->toArray(), array_flip(['name', 'amount_cents', 'category_id', 'member_id', 'account_ids', 'recipient_ids'])) : []), 'next' => $next?->toArray(), 'anchor' => $anchor?->toArray()];
        });

        $active = $this->filterSeriesAssignment(Series::where('kind', 'subscription')->where(fn ($q) => $q->whereNull('cancel_date')->orWhere('cancel_date', '>', now($r->user()->timezone)->toDateString())), $assignment)->get();
        $multipliers = ['once' => 0, 'weekly' => 52 / 12, 'biweekly' => 26 / 12, 'monthly' => 1, 'twice_monthly' => 2, 'yearly' => 1 / 12];

        return Inertia::render('Finance/Index', ['section' => match ($kind) {
            'income' => 'income',
            'subscription' => 'subscriptions',
            default => 'bills',
        }, 'records' => $records, 'catalog' => $this->catalog(), 'filters' => $r->only(['search', 'show_canceled', 'assignment']),
            'summary' => ['active_count' => $active->count(), 'monthly_estimate_cents' => (string) (int) round($active->sum(function ($s) use ($multipliers) {
                $slot = Occurrence::where('series_id', $s->id)->where('due_date', '<=', now('UTC')->toDateString())->max('slot_order') ?? 0;

                return (int) app(Schedules::class)->valuesAt($s, $slot)['amount_cents'] * $multipliers[$s->frequency];
            }))]]);
    }

    protected function filterSeriesAssignment(Builder $query, ?string $assignment): Builder
    {
        if ($assignment === null) {
            return $query;
        }

        $occurrences = Occurrence::whereColumn('series_id', 'scheduled_series.id');
        $anchor = (clone $occurrences)->select('member_id')
            ->orderByRaw("CASE WHEN status IN ('unpaid', 'not_received') THEN 0 ELSE 1 END")
            ->orderByRaw("CASE WHEN status IN ('unpaid', 'not_received') THEN due_date END ASC")
            ->orderByRaw("CASE WHEN status NOT IN ('unpaid', 'not_received') THEN due_date END DESC")
            ->limit(1);

        return $query->where(function (Builder $query) use ($assignment, $occurrences, $anchor): void {
            $query->where(function (Builder $query) use ($assignment, $occurrences, $anchor): void {
                $query->whereExists((clone $occurrences)->selectRaw('1'));
                $this->filterAssignment($query, $assignment, $anchor);
            })->orWhere(function (Builder $query) use ($assignment, $occurrences): void {
                $query->whereNotExists((clone $occurrences)->selectRaw('1'));
                $this->filterAssignment($query, $assignment, 'scheduled_series.member_id');
            });
        });
    }

    public function dismissSetup(Request $r): mixed
    {
        return $this->change($r, function () use ($r) {
            $house = Household::findOrFail($r->attributes->get('household')->id);
            $house->update(['setup_dismissed_at' => now()]);

            return $house;
        }, 'Setup checklist hidden for this household.');
    }

    public function seriesDetail(Request $r, string $id): mixed
    {
        $series = Series::where('kind', 'subscription')->findOrFail($id);
        $payments = Occurrence::where('series_id', $id);
        $nextDate = (clone $payments)->where('status', 'unpaid')->orderBy('due_date')->value('due_date');
        $paid = (clone $payments)->where('status', 'paid')->get();
        $year = now('UTC')->format('Y');
        $start = Date::now('UTC')->startOfMonth()->subMonths(11);
        $chart = [];
        for ($month = $start; $month <= $start->addMonths(12); $month = $month->addMonth()) {
            $key = $month->format('Y-m');
            $slots = (clone $payments)->whereBetween('due_date', [$month->toDateString(), $month->endOfMonth()->toDateString()])->get();
            $chart[] = ['month' => $key, 'paid_cents' => (string) $paid->filter(fn ($o) => str_starts_with($o->completed_date ?? '', $key))->sum('amount_cents'), 'scheduled_cents' => (string) $slots->where('status', 'unpaid')->sum('amount_cents')];
        }

        $paymentRows = $payments->where(fn ($q) => $q->where('due_date', '<=', $nextDate ?? now($r->user()->timezone)->toDateString())->orWhere('status', 'paid'))->latest('due_date')->orderByDesc('slot_order')->paginate($this->pageSize($r))->withQueryString();
        $paymentRows->getCollection()->transform(function ($payment) {
            $links = Attachment::where('occurrence_id', $payment->id)->whereNull('detached_at')->get()->map(function ($link) {
                $transaction = Transaction::withTrashed()->find($link->transaction_id);

                return ! $transaction || $transaction->deleted_at ? 'Deleted transaction' : ($transaction->hidden ? 'Hidden transaction' : $transaction->payee);
            });

            return [...$payment->toArray(), 'attached_payees' => $links];
        });
        $anchor = Occurrence::where('series_id', $id)->where('due_date', $nextDate)->first() ?? Occurrence::where('series_id', $id)->latest('due_date')->first();

        return response()->json(['series' => [...$series->toArray(), ...($anchor ? array_intersect_key($anchor->toArray(), array_flip(['name', 'amount_cents', 'category_id', 'member_id', 'account_ids', 'recipient_ids'])) : [])], 'payments' => $paymentRows,
            'summary' => ['paid_total_cents' => (string) $paid->sum('amount_cents'), 'paid_count' => $paid->count(), 'paid_year_cents' => (string) $paid->filter(fn ($o) => str_starts_with($o->completed_date ?? '', $year))->sum('amount_cents')], 'chart' => $chart]);
    }

    private function values(Request $r, bool $create = true, ?Series $existing = null): array
    {
        $unknownAllowed = $existing?->generated_purpose === 'statement';
        $v = $r->validate(['name' => ($create ? 'required' : 'sometimes').'|string|max:120', 'kind' => 'required|in:bill,income,subscription',
            'amount' => $unknownAllowed ? 'present|nullable|string' : 'required|string', 'frequency' => 'required|in:once,weekly,biweekly,monthly,twice_monthly,yearly',
            'first_date' => 'required|date_format:Y-m-d', 'end_date' => 'nullable|date_format:Y-m-d|after_or_equal:first_date',
            'day_one' => 'nullable|integer|between:1,31', 'day_two' => 'nullable|integer|between:1,31', 'category_id' => 'nullable|uuid', 'member_id' => 'nullable|uuid',
            ...(($existing?->kind ?? $r->input('kind')) === 'income' ? ['account_ids' => 'array', 'account_ids.*' => 'uuid'] : []),
            'recipient_ids' => 'array', 'recipient_ids.*' => 'uuid']);
        $v['amount_cents'] = $unknownAllowed && $v['amount'] === null ? null : Money::parse($v['amount']);
        unset($v['amount']);
        if ($v['frequency'] === 'twice_monthly' && (! ($v['day_one'] ?? null) || ! ($v['day_two'] ?? null) || $v['day_one'] === $v['day_two'])) {
            throw ValidationException::withMessages(['day_two' => 'Choose two different days of the month.']);
        }
        if ($v['kind'] === 'income') {
            $v['recipient_ids'] = [];
        }
        if ($create) {
            $v['recipient_ids'] ??= [];
        }
        if (($existing?->kind ?? $v['kind']) !== 'income') {
            $v['account_ids'] = [];
        }
        $this->relations($v);
        if (! empty($v['category_id'])) {
            $category = Category::findOrFail($v['category_id']);
            if ($category->kind !== ($v['kind'] === 'income' ? 'income' : 'expense')) {
                throw ValidationException::withMessages(['category_id' => 'Choose a category that matches this payment type.']);
            }
        }

        return $v;
    }

    public function store(Request $r, Schedules $service)
    {
        return $this->change($r, function () use ($r, $service) {
            $series = Series::create($this->values($r));
            $service->materialize($series, now()->addMonths(18)->toDateString());
            Audit::record($series, 'created');

            return $series;
        }, 'Schedule created.');
    }

    public function update(Request $r, string $id, Schedules $service)
    {
        return $this->change($r, function () use ($r, $id, $service) {
            $series = Series::findOrFail($id);
            $this->version($r, $series);
            $v = $this->values($r, false, $series);
            $scope = $r->validate(['scope' => 'required|in:occurrence,future', 'anchor_id' => 'required|uuid']);
            $anchor = Occurrence::where('series_id', $id)->findOrFail($scope['anchor_id']);
            $changes = [];
            foreach ($v as $k => $value) {
                if ($value != (! in_array($k, ['kind', 'frequency', 'first_date', 'end_date', 'day_one', 'day_two']) ? $anchor->getAttribute($k) : $series->getAttribute($k))) {
                    $changes[$k] = $value;
                }
            }
            if ($scope['scope'] === 'occurrence' && $v['first_date'] !== $series->first_date) {
                $changes['due_date'] = $v['first_date'];
            }
            unset($changes['kind']);
            $service->edit($series, $anchor, $changes, $scope['scope']);

            return $series;
        });
    }

    public function destroy(Request $r, string $id, Schedules $service)
    {
        return $this->change($r, function () use ($r, $id, $service) {
            $s = Series::findOrFail($id);
            $this->version($r, $s);
            if ($s->kind === 'subscription') {
                foreach (Occurrence::where('series_id', $id)->get() as $o) {
                    $o->delete();
                } $before = $s->toArray();
                $s->delete();
                Audit::record($s, 'deleted', $before);
            } else {
                $v = $r->validate(['scope' => 'required|in:occurrence,future', 'anchor_id' => 'required|uuid']);
                $service->remove($s, Occurrence::where('series_id', $id)->findOrFail($v['anchor_id']), $v['scope']);
            }

            return $s;
        }, 'Schedule removed.');
    }

    public function cancel(Request $r, string $id)
    {
        return $this->change($r, function () use ($r, $id) {
            $s = Series::where('kind', 'subscription')->findOrFail($id);
            $this->version($r, $s);
            abort_if($s->cancel_date, 409, 'Cancellation is final.');
            $v = $r->validate(['cancel_date' => 'required|date_format:Y-m-d']);
            $before = $s->toArray();
            $s->update([...$v, 'lock_version' => $s->lock_version + 1]);
            foreach (Occurrence::where('series_id', $id)->where('status', 'unpaid')->where('due_date', '>=', $v['cancel_date'])->get() as $o) {
                $o->delete();
            } Audit::record($s, 'cancellation_scheduled', $before);

            return $s;
        }, 'Cancellation recorded. Cancel with the service separately.');
    }

    public function detail(Request $r, string $id)
    {
        $o = Occurrence::findOrFail($id);
        $attached = Attachment::where('occurrence_id', $id)->whereNull('detached_at')->get()->map(function ($a) use ($r) {
            $t = Transaction::withTrashed()->find($a->transaction_id);
            if (! $t || $t->deleted_at) {
                return ['id' => $a->id, 'display_state' => 'deleted'];
            } if ($t->hidden && ! $r->boolean('show_hidden')) {
                return ['id' => $a->id, 'display_state' => 'hidden'];
            }

            return ['id' => $a->id, 'display_state' => 'visible', 'transaction' => $t->toArray()];
        });

        return response()->json(['occurrence' => $o, 'series' => Series::find($o->series_id), 'previous_id' => Occurrence::where('series_id', $o->series_id)->where('slot_order', '<', $o->slot_order)->orderByDesc('slot_order')->value('id'), 'next_id' => Occurrence::where('series_id', $o->series_id)->where('slot_order', '>', $o->slot_order)->orderBy('slot_order')->value('id'), 'attachments' => $attached, 'suggestions' => app(Matching::class)->suggestions($o), 'history' => AuditEvent::where('subject_type', 'occurrences')->where('subject_id', $id)->latest()->limit(25)->get()->map(fn ($event) => app(HistoryValues::class)->present($event))]);
    }

    public function complete(Request $r, string $id, Loans $loans)
    {
        return $this->change($r, function () use ($r, $id, $loans) {
            $o = Occurrence::findOrFail($id);
            $this->version($r, $o);
            $v = $r->validate(['completed_date' => 'required|date_format:Y-m-d']);
            $before = $o->toArray();
            abort_if(in_array($o->status, ['paid', 'received']), 409, 'This payment is already complete.');
            if ($o->amount_cents === null) {
                throw ValidationException::withMessages(['amount' => 'Enter the statement amount before marking paid.']);
            }
            if ($o->kind === 'loan_installment') {
                $loans->pay(Loan::where('series_id', $o->series_id)->firstOrFail(), (int) $o->amount_cents, $v['completed_date'], $o, $o->account_ids);
            } else {
                $o->update(['status' => $o->kind === 'income' ? 'received' : 'paid', 'completed_date' => $v['completed_date'], 'lock_version' => $o->lock_version + 1]);
            }
            Audit::record($o, 'completed', $before);

            return $o;
        }, 'Payment updated.');
    }

    public function reverse(Request $r, string $id, Loans $loans)
    {
        return $this->change($r, function () use ($r, $id, $loans) {
            $o = Occurrence::findOrFail($id);
            $this->version($r, $o);
            abort_unless(in_array($o->status, ['paid', 'received']), 409, 'Only a completed payment can be reversed.');
            $before = $o->toArray();
            $o->update(['status' => $o->kind === 'income' ? 'not_received' : 'unpaid', 'completed_date' => null, 'lock_version' => $o->lock_version + 1]);
            if ($o->kind === 'loan_installment') {
                LoanPayment::where('occurrence_id', $o->id)->whereNull('reversed_at')->update(['reversed_at' => now()]);
                $loans->rebuild(Loan::where('series_id', $o->series_id)->firstOrFail(), 'loan_reversal');
            }
            $s = Series::find($o->series_id);
            if ($s?->cancel_date && $o->due_date >= $s->cancel_date) {
                $o->delete();
            } Audit::record($o, 'reversed', $before);

            return $o;
        });
    }

    public function occurrenceUpdate(Request $r, string $id)
    {
        return $this->change($r, function () use ($r, $id) {
            $o = Occurrence::findOrFail($id);
            $this->version($r, $o);
            $v = $r->validate(['amount' => 'sometimes|required|string', 'completed_date' => 'sometimes|required|date_format:Y-m-d', 'due_date' => 'sometimes|required|date_format:Y-m-d']);
            if (isset($v['completed_date']) && ! in_array($o->status, ['paid', 'received'])) {
                throw ValidationException::withMessages(['completed_date' => 'Complete this payment before correcting its actual date.']);
            }
            $before = $o->toArray();
            if (array_key_exists('amount', $v)) {
                $v['amount_cents'] = Money::parse($v['amount']);
                unset($v['amount']);
            }if ($o->kind === 'loan_installment' && array_key_exists('amount_cents', $v)) {
                throw ValidationException::withMessages(['amount' => 'Edit repayment terms in Loans.']);
            }$o->update([...$v, 'lock_version' => $o->lock_version + 1, 'reminder_version' => $o->reminder_version + 1]);
            if ($o->kind === 'loan_installment' && isset($v['completed_date'])) {
                LoanPayment::where('occurrence_id', $o->id)->whereNull('reversed_at')->update(['payment_date' => $v['completed_date']]);
            }Audit::record($o, 'corrected', $before);

            return $o;
        });
    }

    public function preview(Request $r, Recurrence $recurrence)
    {
        $v = $r->validate(['frequency' => 'required|in:once,weekly,biweekly,monthly,twice_monthly,yearly', 'first_date' => 'required|date_format:Y-m-d', 'end_date' => 'nullable|date_format:Y-m-d', 'day_one' => 'required_if:frequency,twice_monthly|nullable|integer|between:1,31', 'day_two' => 'required_if:frequency,twice_monthly|nullable|integer|between:1,31|different:day_one']);

        return response()->json(['dates' => array_slice($recurrence->slots($v, Date::parse($v['first_date'])->addYear()->toDateString()), 0, 6)]);
    }
}
