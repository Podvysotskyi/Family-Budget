<?php

namespace App\Domain\Banking;

use App\Models\Account;
use App\Models\Connection;
use App\Models\OutboxMessage;
use App\Models\SyncRun;

final class Syncs
{
    public function request(Connection $connection, string $trigger = 'manual', ?string $bucket = null): SyncRun
    {
        abort_unless($connection->state === 'active', 422, 'This connection is disconnected.');
        abort_if(Account::where('connection_id', $connection->id)->whereNull('import_start_date')->exists(), 422, 'Confirm import starting dates in connection details first.');
        $run = SyncRun::where('connection_id', $connection->id)->whereIn('state', ['queued', 'running'])->first();
        if ($run) {
            return $run;
        }
        if ($bucket && ($existing = SyncRun::where('connection_id', $connection->id)->where('hourly_bucket', $bucket)->first())) {
            return $existing;
        }
        $run = SyncRun::create(['connection_id' => $connection->id, 'trigger' => $trigger, 'hourly_bucket' => $bucket]);
        OutboxMessage::create(['kind' => 'sync', 'payload' => ['run_id' => $run->id, 'household_id' => $run->household_id]]);

        return $run;
    }
}
