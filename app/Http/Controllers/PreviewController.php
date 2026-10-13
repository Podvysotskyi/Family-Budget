<?php

namespace App\Http\Controllers;

use App\Domain\Loans\Loans;
use App\Domain\Scheduling\Recurrence;
use App\Domain\Shared\Money;
use App\Models\Account;
use App\Models\Category;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\Occurrence;
use App\Models\Series;
use App\Models\Suppression;
use App\Models\TargetOverride;
use App\Models\TargetPeriod;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PreviewController extends FinanceController
{
    public function show(Request $request, string $kind, Recurrence $recurrence, Loans $loans): JsonResponse
    {
        abort_unless(in_array($kind, ['transaction', 'limit', 'loan', 'payment', 'category']), 404);
        if ($kind === 'category') {
            $values = $request->validate(['id' => 'required|uuid']);
            $category = Category::findOrFail($values['id']);
            $ids = Category::where('id', $category->id)->orWhere('parent_id', $category->id)->pluck('id');

            return response()->json(['transactions' => Transaction::whereIn('category_id', $ids)->count(), 'schedules' => Series::whereIn('category_id', $ids)->count(),
                'payments' => Occurrence::whereIn('category_id', $ids)->count(), 'children' => $ids->count() - 1,
                'target_changes' => TargetPeriod::whereIn('category_id', $ids)->where(fn ($query) => $query->whereNull('end_month')->orWhere('end_month', '>', now('UTC')->startOfMonth()->toDateString()))->count()
                    + TargetOverride::whereIn('category_id', $ids)->where('month', '>=', now('UTC')->startOfMonth()->toDateString())->count()]);
        }
        if ($kind === 'transaction') {
            $values = $request->validate(['account_id' => 'required|uuid', 'amount' => 'required|string', 'direction' => 'required|in:in,out', 'update_balance' => 'required|boolean']);
            $account = Account::where('source', 'manual')->findOrFail($values['account_id']);
            $delta = Money::parse($values['amount']) * ($values['direction'] === 'out' ? -1 : 1) * (in_array($account->type, ['loan', 'credit_card']) ? -1 : 1);
            $before = $account->balance_cents;

            return response()->json(['before_cents' => $before === null ? null : (string) $before, 'delta_cents' => $values['update_balance'] ? (string) $delta : '0',
                'after_cents' => $before === null ? null : (string) ((int) $before + ($values['update_balance'] ? $delta : 0))]);
        }
        if ($kind === 'limit') {
            $values = $request->validate(['id' => 'nullable|uuid', 'limit' => 'required|string', 'balance' => 'nullable|string']);
            $account = ! empty($values['id']) ? Account::where('type', 'credit_card')->findOrFail($values['id']) : null;
            $limit = Money::parse($values['limit']);
            $balance = $account ? $account->balance_cents : (isset($values['balance']) ? Money::parse($values['balance'], true) : null);

            return response()->json(['limit_cents' => (string) $limit, 'balance_cents' => $balance === null ? null : (string) $balance,
                'usage_percent' => $limit > 0 && $balance !== null ? round(max(0, (int) $balance) / $limit * 100, 2) : null]);
        }
        if ($kind === 'payment') {
            $values = $request->validate(['id' => 'required|uuid', 'payment_id' => 'nullable|uuid', 'amount' => 'required|string']);
            $loan = Loan::findOrFail($values['id']);
            abort_unless($loan->series_id, 422);
            $payment = ! empty($values['payment_id']) ? LoanPayment::where('loan_id', $loan->id)->whereIn('kind', ['extra', 'past_payment'])->whereNull('reversed_at')->findOrFail($values['payment_id']) : null;
            $before = (int) $loan->repayment_total_cents - $loans->paid($loan);
            $amount = Money::parse($values['amount']);
            $after = $before + (int) ($payment?->amount_cents ?? 0) - $amount;
            if ($amount <= 0 || $after < 0) {
                throw ValidationException::withMessages(['amount' => 'Payment must be positive and cannot exceed the remaining balance.']);
            }
            $adjusted = clone $loan;
            $adjusted->repayment_total_cents = (int) $loan->repayment_total_cents + (int) ($payment?->amount_cents ?? 0) - $amount;
            $projection = $loans->projection($adjusted);
            $rows = [];
            $remaining = $after;
            foreach ($projection as $slot) {
                if ($remaining <= 0) {
                    break;
                }
                $pay = min((int) $loan->installment_cents, $remaining);
                $remaining -= $pay;
                $rows[] = ['date' => $slot['due_date'], 'amount_cents' => (string) $pay];
            }

            return response()->json(['before_cents' => (string) $before, 'after_cents' => (string) $after, 'payments' => $rows,
                'remaining_count' => count($rows), 'final_date' => $rows ? $rows[array_key_last($rows)]['date'] : null]);
        }
        $values = $request->validate(['id' => 'nullable|uuid', 'balance' => 'required|string', 'installment' => 'required|string', 'frequency' => 'required|in:weekly,biweekly,monthly,twice_monthly,yearly',
            'first_date' => 'required|date_format:Y-m-d', 'day_one' => 'required_if:frequency,twice_monthly|nullable|integer|between:1,31', 'day_two' => 'required_if:frequency,twice_monthly|nullable|integer|between:1,31|different:day_one']);
        $loan = ! empty($values['id']) ? Loan::findOrFail($values['id']) : null;
        $paid = $loan?->series_id ? $loans->paid($loan) : 0;
        $remaining = Money::parse($values['balance']) - $paid;
        $installment = Money::parse($values['installment']);
        if ($remaining < 0 || $installment <= 0) {
            throw ValidationException::withMessages(['balance' => 'The repayment total must cover paid amounts and the installment must be positive.']);
        }
        $past = $request->validate(['past_payments' => 'sometimes|array|max:500', 'past_payments.*.slot_key' => 'required|string|distinct|max:30', 'past_payments.*.amount' => 'required|string']);
        $paidSlots = [];
        foreach ($past['past_payments'] ?? [] as $payment) {
            $remaining -= Money::parse($payment['amount']);
            $paidSlots[] = $payment['slot_key'];
        }
        if ($remaining < 0) {
            throw ValidationException::withMessages(['past_payments' => 'Past payments cannot exceed the repayment total.']);
        }
        $start = $remaining;
        $existing = $loan?->series_id ? Occurrence::withTrashed()->where('series_id', $loan->series_id)->get()->keyBy('generation_key') : collect();
        $series = $loan?->series_id ? Series::findOrFail($loan->series_id) : null;
        $dateFields = $values['frequency'] === 'twice_monthly' ? ['frequency', 'first_date', 'day_one', 'day_two'] : ['frequency', 'first_date'];
        $datesChanged = $series && collect($dateFields)->contains(fn ($field) => isset($values[$field]) && $values[$field] != $series->getAttribute($field));
        $suppressions = $series ? Suppression::where('series_id', $series->id)->get() : collect();
        $rows = [];
        foreach ($recurrence->slots($values, now()->addYears(50)->toDateString()) as $slot) {
            if ($remaining <= 0) {
                break;
            }
            $current = $existing->get($slot['key']);
            if ($suppressions->contains(fn ($range) => $slot['slot'] >= $range->first_slot && ($range->last_slot === null || $slot['slot'] <= $range->last_slot)) || in_array($slot['key'], $paidSlots) || ($current && (($current->deleted_at && ! ($current->overrides['loan_tail_trimmed'] ?? false)) || $current->status === 'paid'))) {
                continue;
            }
            $amount = min($installment, $remaining);
            $remaining -= $amount;
            $rows[] = ['date' => $datesChanged ? $slot['date'] : ($current?->due_date ?? $slot['date']), 'amount_cents' => (string) $amount];
        }

        return response()->json(['paid_cents' => (string) $paid, 'remaining_cents' => (string) $start, 'payments' => $rows,
            'remaining_count' => count($rows), 'final_date' => $rows ? $rows[array_key_last($rows)]['date'] : null, 'incomplete' => $remaining > 0]);
    }
}
