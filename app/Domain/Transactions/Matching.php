<?php

namespace App\Domain\Transactions;

use App\Models\Attachment;
use App\Models\Occurrence;
use App\Models\Transaction;
use Carbon\CarbonImmutable as Date;

final class Matching
{
    public function suggestions(Occurrence $o): array
    {
        $requiresAccounts = in_array($o->kind, ['income', 'loan_installment']);
        if ($o->amount_cents === null || ($requiresAccounts && ! $o->account_ids)) {
            return [];
        }
        $date = Date::parse($o->due_date);
        $q = Transaction::where('hidden', false)
            ->when($requiresAccounts, fn ($query) => $query->whereIn('account_id', $o->account_ids))
            ->where('amount_cents', ($o->kind === 'income' ? 1 : -1) * (int) $o->amount_cents)
            ->whereBetween('transaction_date', [$date->subDays(7)->toDateString(), $date->addDays(7)->toDateString()])
            ->whereNotIn('id', Attachment::where('active_claim', true)->whereNull('detached_at')->pluck('transaction_id'))
            ->orderByRaw('abs(transaction_date - ?::date)', [$o->due_date])
            ->orderByRaw('similarity(lower(payee),lower(?)) DESC', [$o->name])->orderByDesc('transaction_date')->orderBy('id');

        return $q->limit(5)->get()->toArray();
    }
}
