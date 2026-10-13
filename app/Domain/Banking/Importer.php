<?php

namespace App\Domain\Banking;

use App\Domain\History\Audit;
use App\Domain\Shared\Money;
use App\Models\Account;
use App\Models\ProviderIdentity;
use App\Models\Transaction;

final class Importer
{
    public function transaction(Account $account, array $row): Transaction
    {
        $key = $row['key'];
        $identity = ProviderIdentity::where('account_id', $account->id)->where('external_key', $key)->first();
        if (! $identity && ! empty($row['predecessor_key'])) {
            $identity = ProviderIdentity::where('account_id', $account->id)->where('external_key', $row['predecessor_key'])->first();
        }
        $transaction = $identity ? Transaction::withTrashed()->findOrFail($identity->transaction_id) : null;
        if ($transaction?->deleted_at) {
            ProviderIdentity::firstOrCreate(['account_id' => $account->id, 'external_key' => $key], ['transaction_id' => $transaction->id]);

            return $transaction;
        }
        validator($row, ['key' => 'required|string|max:255', 'amount' => 'required|string', 'date' => 'required|date_format:Y-m-d', 'payee' => 'required|string|max:200', 'status' => 'required|in:pending,posted'])->validate();
        $values = ['amount_cents' => Money::parse($row['amount'], true), 'transaction_date' => $row['date'], 'payee' => $row['payee'], 'status' => $row['status']];
        if (! $transaction) {
            $transaction = Transaction::create([...$values, 'account_id' => $account->id, 'source' => 'provider', 'category_origin' => 'provider']);
            Audit::record($transaction, 'imported');
        } elseif (array_diff_assoc($values, $transaction->only(array_keys($values)))) {
            $before = $transaction->toArray();
            $transaction->update([...$values, 'lock_version' => $transaction->lock_version + 1]);
            Audit::record($transaction, 'source_corrected', $before);
        }
        ProviderIdentity::firstOrCreate(['account_id' => $account->id, 'external_key' => $key], ['transaction_id' => $transaction->id]);

        return $transaction;
    }
}
