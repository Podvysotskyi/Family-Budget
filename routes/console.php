<?php

use App\Domain\Banking\Syncs;
use App\Domain\Budget\Budget;
use App\Domain\Loans\Loans;
use App\Domain\Notifications\Reminders;
use App\Domain\Scheduling\Schedules;
use App\Jobs\DisconnectConnection;
use App\Jobs\SyncConnection;
use App\Models\Account;
use App\Models\Connection;
use App\Models\Household;
use App\Models\Loan;
use App\Models\OutboxMessage;
use App\Models\Series;
use App\Models\SyncRun;
use App\Support\HouseholdContext;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('app:grant', function () {
    DB::statement('GRANT USAGE ON SCHEMA public TO finance_app');
    DB::statement('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO finance_app');
    DB::statement('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO finance_app');
    DB::statement('REVOKE UPDATE,DELETE ON audit_events,account_balance_events FROM finance_app');
    DB::statement('REVOKE ALL ON migrations FROM finance_app');
    $this->info('Runtime role granted; append-only financial history protected.');
});
Artisan::command('app:tick', function () {
    foreach (Household::cursor() as $house) {
        app(HouseholdContext::class)->run($house->id, function () use ($house) {
            if (! Household::whereKey($house->id)->lockForUpdate()->first()) {
                return;
            }
            foreach (Series::where('kind', '!=', 'loan_installment')->get() as $series) {
                app(Schedules::class)->materialize($series, now()->addMonths(18)->toDateString());
            }
            foreach (Loan::whereNotNull('series_id')->get() as $loan) {
                app(Loans::class)->materialize($loan);
            }
            $reminders = app(Reminders::class);
            $reminders->plan();
            $reminders->deliver();
            app(Budget::class)->evaluate();
        });
    }
    $this->info('Projections and reminders reconciled.');
});
Schedule::command('app:tick')->everyMinute()->withoutOverlapping(5);
Schedule::command('app:sync-hourly')->hourly()->withoutOverlapping(10);
Schedule::command('app:publish-outbox')->everyMinute()->withoutOverlapping(5);
Artisan::command('app:sync-hourly', function () {
    foreach (Household::cursor() as $house) {
        app(HouseholdContext::class)->run($house->id, function () use ($house) {
            Household::whereKey($house->id)->lockForUpdate()->firstOrFail();
            foreach (Connection::where('state', 'active')->get() as $connection) {
                if (! Account::where('connection_id', $connection->id)->whereNull('import_start_date')->exists()) {
                    app(Syncs::class)->request($connection, 'hourly', now('UTC')->format('Y-m-d-H'));
                }
            }
        });
    }
});
Artisan::command('app:publish-outbox', function () {
    foreach (Household::withTrashed()->cursor() as $house) {
        app(HouseholdContext::class)->run($house->id, function () use ($house) {
            Household::withTrashed()->whereKey($house->id)->lockForUpdate()->firstOrFail();
            SyncRun::where('state', 'running')->where('lease_expires_at', '<', now())->update(['state' => 'interrupted', 'finished_at' => now(), 'error' => 'worker_interrupted']);
            foreach (OutboxMessage::whereNull('published_at')->orderBy('created_at')->get() as $message) {
                if ($message->kind === 'sync' && ! $house->deleted_at) {
                    SyncConnection::dispatch($house->id, $message->payload['run_id']);
                } elseif ($message->kind === 'disconnect') {
                    DisconnectConnection::dispatch($house->id, $message->payload['connection_id']);
                }
                $message->update(['published_at' => now()]);
            }
        });
    }
});
