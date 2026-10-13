<?php

namespace App\Jobs;

use App\Domain\Banking\AccountDiscovery;
use App\Domain\Banking\Importer;
use App\Domain\Banking\LunchFlow;
use App\Domain\Budget\Budget;
use App\Domain\History\Audit;
use App\Domain\Shared\Money;
use App\Models\Account;
use App\Models\BalanceEvent;
use App\Models\Connection;
use App\Models\HoldingPosition;
use App\Models\HoldingSnapshot;
use App\Models\Household;
use App\Models\ProviderAuthorization;
use App\Models\SyncAccountRun;
use App\Models\SyncRun;
use App\Support\HouseholdContext;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;

class SyncConnection implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 600;

    public function __construct(public string $householdId, public string $runId)
    {
        $this->onQueue('sync');
    }

    private function scoped(callable $action): mixed
    {
        return app(HouseholdContext::class)->run($this->householdId, function () use ($action) {
            if (! Household::whereKey($this->householdId)->lockForUpdate()->exists()) {
                return null;
            }

            return $action();
        });
    }

    public function handle(LunchFlow $provider, Importer $importer): void
    {
        $lease = (string) Str::uuid();
        $details = $this->scoped(function () use ($provider, $lease) {
            $run = SyncRun::find($this->runId);
            if (! $run || $run->state !== 'queued') {
                return null;
            }
            $connection = Connection::find($run->connection_id);
            if (! $connection || $connection->state !== 'active') {
                $run->update(['state' => 'interrupted', 'finished_at' => now()]);

                return null;
            }
            $run->update(['state' => 'running', 'started_at' => now(), 'lease_token' => $lease, 'lease_expires_at' => now()->addMinutes(11)]);
            $token = $provider->accessToken(ProviderAuthorization::findOrFail($connection->authorization_id));

            return ['connection' => $connection->toArray(), 'token' => $token, 'accounts' => Account::where('connection_id', $connection->id)->whereNotNull('import_start_date')->get()->toArray()];
        });
        if (! $details) {
            return;
        }
        $failed = false;
        try {
            $discovery = $provider->get($details['token'], '/accounts');
            $accounts = $this->scoped(function () use ($details, $lease, $discovery) {
                $run = SyncRun::find($this->runId);
                $connection = Connection::find($details['connection']['id']);
                if (! $run || $run->state !== 'running' || $run->lease_token !== $lease || ! $connection || $connection->state !== 'active' || $connection->lifecycle_version !== $details['connection']['lifecycle_version']) {
                    return null;
                }
                app(AccountDiscovery::class)->discover(ProviderAuthorization::findOrFail($connection->authorization_id), $discovery['accounts'] ?? [], false, $connection->external_key);

                return Account::where('connection_id', $connection->id)->whereNotNull('import_start_date')->get()->toArray();
            });
            if ($accounts === null) {
                return;
            }
            $details['accounts'] = $accounts;
        } catch (\Throwable $error) {
            $failed = true;
        }
        foreach ($details['accounts'] as $account) {
            try {
                $rows = $provider->transactions($details['token'], $account['provider_account_key']);
                $balance = $provider->get($details['token'], '/accounts/'.rawurlencode($account['provider_account_key']).'/balance');
                $holdings = $account['type'] === 'investment' ? $provider->get($details['token'], '/accounts/'.rawurlencode($account['provider_account_key']).'/holdings', [], true) : null;
                $this->scoped(function () use ($details, $lease, $account, $rows, $balance, $holdings, $importer) {
                    $run = SyncRun::find($this->runId);
                    $connection = Connection::find($details['connection']['id']);
                    if (! $run || $run->state !== 'running' || $run->lease_token !== $lease || ! $connection || $connection->state !== 'active' || $connection->lifecycle_version !== $details['connection']['lifecycle_version']) {
                        return;
                    }
                    $a = Account::find($account['id']);
                    if (! $a) {
                        return;
                    }
                    $count = 0;
                    foreach ($rows as $row) {
                        if ($row['date'] >= ($a->import_start_date ?? '0000-00-00')) {
                            $importer->transaction($a, $row);
                            $count++;
                        }
                    }
                    if (($balance['balance']['currency'] ?? null) !== 'USD' || ! isset($balance['balance']['amount'])) {
                        throw new \RuntimeException('Unsupported or unavailable balance.');
                    }
                    $cents = Money::parse((string) $balance['balance']['amount'], true);
                    $before = $a->toArray();
                    $a->update(['balance_cents' => $cents, 'balance_date' => now('UTC')->toDateString(), 'balance_observed_at' => now(), 'last_success_at' => now(), 'latest_error' => null, 'lock_version' => $a->lock_version + 1]);
                    BalanceEvent::create(['account_id' => $a->id, 'kind' => 'provider_snapshot', 'balance_cents' => $cents, 'effective_date' => now('UTC')->toDateString()]);
                    Audit::record($a, 'synced', $before);
                    if ($holdings !== null) {
                        if ($holdings['unsupported'] ?? false) {
                            HoldingSnapshot::create(['account_id' => $a->id, 'observed_at' => now(), 'complete' => false]);
                        } else {
                            if (($holdings['currency'] ?? null) !== 'USD' || ! isset($holdings['holdings'])) {
                                throw new \RuntimeException('Unsupported holdings response.');
                            }
                            $snapshot = HoldingSnapshot::create(['account_id' => $a->id, 'observed_at' => now(), 'complete' => true]);
                            foreach ($holdings['holdings'] as $position) {
                                if (($position['currency'] ?? null) !== 'USD') {
                                    throw new \RuntimeException('Unsupported holding currency.');
                                }
                                $security = $position['security'];
                                HoldingPosition::create(['snapshot_id' => $snapshot->id, 'security_key' => $security['isin'] ?? $security['tickerSymbol'] ?? hash('sha256', $security['name']),
                                    'symbol' => $security['tickerSymbol'] ?? null, 'description' => $security['name'], 'quantity' => (string) $position['quantity'],
                                    'unit_price' => isset($position['price']) ? (string) $position['price'] : null, 'market_value_cents' => isset($position['value']) ? Money::parse((string) $position['value'], true) : null,
                                    'cost_basis_cents' => isset($position['costBasis']) ? Money::parse((string) $position['costBasis'], true) : null]);
                            }
                        }
                    }
                    SyncAccountRun::updateOrCreate(['sync_run_id' => $run->id, 'account_id' => $a->id], ['state' => 'succeeded', 'imported_count' => $count]);
                    app(Budget::class)->evaluate();
                });
            } catch (\Throwable $error) {
                $failed = true;
                $this->scoped(function () use ($account, $lease, $details) {
                    $run = SyncRun::find($this->runId);
                    $connection = Connection::find($details['connection']['id']);
                    if (! $run || $run->lease_token !== $lease || $run->state !== 'running' || ! $connection || $connection->state !== 'active' || $connection->lifecycle_version !== $details['connection']['lifecycle_version']) {
                        return;
                    }
                    $a = Account::find($account['id']);
                    if (! $a) {
                        return;
                    }
                    $a->update(['latest_error' => 'sync_failed']);
                    SyncAccountRun::updateOrCreate(['sync_run_id' => $run->id, 'account_id' => $a->id], ['state' => 'failed', 'error' => 'provider_read_or_validation_failed']);
                });
            }
        }
        $this->scoped(function () use ($details, $lease, $failed) {
            $run = SyncRun::find($this->runId);
            $connection = Connection::find($details['connection']['id']);
            if (! $run || $run->state !== 'running' || $run->lease_token !== $lease) {
                return;
            }
            if (! $connection || $connection->state !== 'active' || $connection->lifecycle_version !== $details['connection']['lifecycle_version']) {
                $run->update(['state' => 'interrupted', 'finished_at' => now()]);

                return;
            }
            $run->update(['state' => $failed ? 'partial' : 'succeeded', 'finished_at' => now(), 'error' => $failed ? 'one_or_more_accounts_failed' : null]);
            if ($connection && $connection->state === 'active') {
                $connection->update(['latest_error' => $failed ? 'sync_failed' : null, ...($failed ? [] : ['last_full_success_at' => now()])]);
            }
        });
    }

    public function failed(?\Throwable $error): void
    {
        $this->scoped(function () {
            SyncRun::whereKey($this->runId)->whereIn('state', ['queued', 'running'])->update(['state' => 'failed', 'finished_at' => now(), 'error' => 'worker_or_authorization_failed']);
        });
    }
}
