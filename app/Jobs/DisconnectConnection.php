<?php

namespace App\Jobs;

use App\Domain\Banking\LunchFlow;
use App\Models\Connection;
use App\Models\Household;
use App\Models\ProviderAuthorization;
use App\Support\HouseholdContext;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class DisconnectConnection implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [60, 300];

    public int $timeout = 60;

    public function __construct(public string $householdId, public string $connectionId)
    {
        $this->onQueue('sync');
    }

    public function handle(LunchFlow $provider): void
    {
        app(HouseholdContext::class)->run($this->householdId, function () use ($provider) {
            Household::withTrashed()->whereKey($this->householdId)->lockForUpdate()->firstOrFail();
            $connection = Connection::withTrashed()->find($this->connectionId);
            if (! $connection || $connection->state !== 'disconnected') {
                return;
            }
            $authorization = ProviderAuthorization::withTrashed()->find($connection->authorization_id);
            if (! $authorization) {
                return;
            }
            $provider->disconnect($provider->accessToken($authorization), $connection->external_key);
        });
    }
}
