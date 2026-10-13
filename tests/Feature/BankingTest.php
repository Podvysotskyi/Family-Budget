<?php

namespace Tests\Feature;

use App\Domain\Banking\Importer;
use App\Domain\Banking\Syncs;
use App\Models\Account;
use App\Models\Connection;
use App\Models\Transaction;
use Tests\FinanceTestCase;

class BankingTest extends FinanceTestCase
{
    public function test_provider_reimport_preserves_annotations_pending_identity_and_tombstones(): void
    {
        [, $house] = $this->household();
        $this->inHouse($house, function () {
            $a = Account::factory()->create(['source' => 'provider']);
            $import = app(Importer::class);
            $pending = $import->transaction($a, ['key' => 'pending', 'amount' => '-10.50', 'date' => '2026-10-01', 'payee' => 'Store', 'status' => 'pending']);
            $pending->update(['notes' => 'My note', 'hidden' => true, 'category_origin' => 'member']);
            $posted = $import->transaction($a, ['key' => 'posted', 'predecessor_key' => 'pending', 'amount' => '-12.00', 'date' => '2026-10-02', 'payee' => 'Store posted', 'status' => 'posted']);
            $this->assertSame($pending->id, $posted->id);
            $this->assertSame('My note', $posted->notes);
            $this->assertTrue($posted->hidden);
            $posted->delete();
            $import->transaction($a, ['key' => 'posted', 'amount' => '-12.00', 'date' => '2026-10-02', 'payee' => 'Store posted', 'status' => 'posted']);
            $this->assertSame(0, Transaction::count());
            $this->assertSame(1, Transaction::withTrashed()->count());
        });
    }

    public function test_sync_requests_share_active_run_and_completed_manual_runs_have_no_cooldown(): void
    {
        [, $house] = $this->household();
        $this->inHouse($house, function () {
            $c = Connection::create(['external_key' => 'bank', 'name' => 'Bank']);
            $service = app(Syncs::class);
            $one = $service->request($c);
            $two = $service->request($c, 'hourly', '2026-10-03-12');
            $this->assertSame($one->id, $two->id);
            $one->update(['state' => 'succeeded', 'finished_at' => now()]);
            $next = $service->request($c);
            $this->assertNotSame($one->id, $next->id);
        });
    }
}
