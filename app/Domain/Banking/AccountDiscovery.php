<?php

namespace App\Domain\Banking;

use App\Domain\History\Audit;
use App\Models\Account;
use App\Models\Connection;
use App\Models\ProviderAuthorization;
use App\Support\HouseholdContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class AccountDiscovery
{
    public function bind(string $user, string $kind, string $key): bool
    {
        $house = app(HouseholdContext::class)->id;
        DB::table('provider_resource_bindings')->insertOrIgnore(['id' => (string) Str::uuid(), 'household_id' => $house, 'provider_user_key' => $user, 'resource_kind' => $kind, 'external_key' => $key, 'created_at' => now(), 'updated_at' => now()]);

        return DB::table('provider_resource_bindings')->where('provider_user_key', $user)->where('resource_kind', $kind)->where('external_key', $key)->value('household_id') === $house;
    }

    public function discover(ProviderAuthorization $authorization, array $rows, bool $initial, ?string $onlyConnection = null): void
    {
        foreach ($rows as $row) {
            if (($row['currency'] ?? null) !== 'USD' || ! isset($row['connection_id'], $row['id'], $row['name'])) {
                continue;
            }
            $connectionKey = (string) $row['connection_id'];
            if ($onlyConnection !== null && $connectionKey !== $onlyConnection) {
                continue;
            }
            $accountKey = (string) $row['id'];
            if (! $this->bind($authorization->provider_user_key, 'connection', $connectionKey) || ! $this->bind($authorization->provider_user_key, 'account', $accountKey)) {
                continue;
            }
            $connection = Connection::withTrashed()->firstOrCreate(['authorization_id' => $authorization->id, 'external_key' => $connectionKey], ['name' => $row['institution_name'] ?? 'Connected bank']);
            if ($connection->deleted_at || $connection->state !== 'active') {
                continue;
            }
            $account = Account::withTrashed()->firstOrCreate(['connection_id' => $connection->id, 'provider_account_key' => $accountKey], ['name' => $row['name'], 'institution_name' => $row['institution_name'] ?? null, 'type' => in_array($row['type'] ?? '', ['checking', 'savings', 'credit_card', 'loan', 'investment']) ? $row['type'] : 'checking', 'source' => 'provider', 'discovery_date' => now('UTC')->toDateString(), 'import_start_date' => $initial ? null : now('UTC')->toDateString()]);
            if ($account->wasRecentlyCreated) {
                Audit::record($account, 'discovered');
            }
        }
    }
}
