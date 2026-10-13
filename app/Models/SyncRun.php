<?php

namespace App\Models;

class SyncRun extends FinanceRecord
{
    protected $table = 'sync_runs';

    protected $attributes = ['lock_version' => 1, 'state' => 'queued'];
}
