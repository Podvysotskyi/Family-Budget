<?php

namespace Tests\Feature;

use App\Domain\Banking\Importer;
use App\Domain\Banking\LunchFlow;
use App\Domain\History\Audit;
use App\Jobs\SyncConnection;
use App\Models\Account;
use App\Models\AuditEvent;
use App\Models\BalanceEvent;
use App\Models\Category;
use App\Models\Connection;
use App\Models\CreditLimit;
use App\Models\HoldingPosition;
use App\Models\HoldingSnapshot;
use App\Models\InvestmentActivity;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\Occurrence;
use App\Models\ProviderAuthorization;
use App\Models\SyncRun;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\FinanceTestCase;

class ImplementationCompletionTest extends FinanceTestCase
{
    public function test_public_landing_and_account_detail_pages_have_working_access_boundaries(): void
    {
        $this->get('/')->assertInertia(fn (Assert $page) => $page->component('Landing')->where('auth', null));
        [$user, $house] = $this->household();
        [, $foreign] = $this->household();
        $account = $this->inHouse($house, fn () => Account::factory()->create());
        $other = $this->inHouse($foreign, fn () => Account::factory()->create());
        $this->get('/accounts/'.$account->id)->assertRedirect('/sign-in');
        $this->actingAs($user)->get('/')->assertRedirect('/home');
        $this->get('/accounts/'.$account->id)->assertInertia(fn (Assert $page) => $page->component('Finance/AccountShow')->where('detail.account.id', $account->id)->has('catalog'));
        $this->getJson('/accounts/'.$other->id)->assertNotFound();
        $this->getJson('/accounts/not-a-uuid')->assertNotFound();
        $this->from('/accounts/'.$account->id)->delete('/accounts/'.$account->id, ['lock_version' => 1])->assertRedirect('/accounts');
    }

    public function test_account_activity_paginates_mixed_rows_and_searches_without_unrelated_balances(): void
    {
        [$user, $house] = $this->household();
        $account = $this->inHouse($house, function () {
            $account = Account::factory()->create();
            for ($index = 0; $index < 11; $index++) {
                Transaction::create(['account_id' => $account->id, 'source' => 'manual', 'payee' => 'Grocer '.$index, 'amount_cents' => -105, 'transaction_date' => '2026-10-01']);
            }
            Transaction::create(['account_id' => $account->id, 'source' => 'manual', 'payee' => 'Hidden', 'amount_cents' => -100, 'transaction_date' => '2026-10-01', 'hidden' => true]);
            BalanceEvent::create(['account_id' => $account->id, 'kind' => 'manual_update', 'balance_cents' => 12345, 'effective_date' => '2026-10-02']);

            return $account;
        });
        $this->actingAs($user)->getJson('/accounts/'.$account->id.'?per_page=10')->assertOk()->assertJsonPath('timeline.total', 12)->assertJsonCount(10, 'timeline.data')->assertJsonPath('timeline.data.0.balance_cents', '12345');
        $this->getJson('/accounts/'.$account->id.'?per_page=10&timeline_page=2')->assertJsonCount(2, 'timeline.data');
        $this->getJson('/accounts/'.$account->id.'?search=Grocer')->assertJsonPath('timeline.total', 11)->assertJsonPath('timeline.data.0.entry_type', 'transaction');
        $this->getJson('/accounts/'.$account->id.'?show_hidden=1')->assertJsonPath('timeline.total', 13);
    }

    public function test_financial_previews_use_exact_cents_do_not_mutate_and_reject_foreign_accounts(): void
    {
        [$user, $house] = $this->household();
        [, $foreign] = $this->household();
        $account = $this->inHouse($house, fn () => Account::factory()->create(['type' => 'credit_card', 'balance_cents' => 10001]));
        $other = $this->inHouse($foreign, fn () => Account::factory()->create());
        $this->actingAs($user)->getJson('/previews/transaction?account_id='.$account->id.'&amount=0.29&direction=out&update_balance=1')->assertOk()->assertJsonPath('before_cents', '10001')->assertJsonPath('delta_cents', '29')->assertJsonPath('after_cents', '10030');
        $this->getJson('/previews/transaction?account_id='.$account->id.'&amount=0.29&direction=in&update_balance=0')->assertJsonPath('after_cents', '10001')->assertJsonPath('delta_cents', '0');
        $this->getJson('/previews/limit?id='.$account->id.'&limit=200.02')->assertJsonPath('usage_percent', 50)->assertJsonPath('limit_cents', '20002');
        $this->getJson('/previews/transaction?account_id='.$other->id.'&amount=1&direction=out&update_balance=1')->assertNotFound();
        $this->getJson('/previews/limit?id='.$account->id.'&limit=1.005')->assertUnprocessable();
        $this->inHouse($house, function () use ($account) {
            $this->assertSame(10001, (int) $account->fresh()->balance_cents);
            $this->assertSame(0, Transaction::count());
            $this->assertSame(0, CreditLimit::count());
        });
    }

    public function test_loans_have_paginated_selectors_and_full_payoff_summary(): void
    {
        $this->travelTo(now('UTC')->setDate(2026, 10, 10)->setTime(12, 0));
        [$user, $house] = $this->household();
        $this->actingAs($user);
        for ($index = 0; $index < 11; $index++) {
            $this->post('/loans', ['name' => 'Loan '.$index, 'balance' => '1000', 'balance_date' => '2026-10-10', 'scheduled' => true, 'installment' => '300', 'frequency' => 'monthly', 'first_date' => '2026-11-01'])->assertSessionHasNoErrors();
        }
        $loan = $this->inHouse($house, fn () => Loan::firstOrFail());
        $this->get('/loans?per_page=10')->assertInertia(fn (Assert $page) => $page->has('records.data', 10)->where('records.total', 11));
        $last = $this->inHouse($house, fn () => Loan::orderByDesc('created_at')->orderByDesc('id')->firstOrFail());
        $this->get('/loans?per_page=10&loan='.$last->id)->assertInertia(fn (Assert $page) => $page->where('records.current_page', 2)->where('records.data.0.id', $last->id));
        $this->getJson('/loans/'.$loan->id)->assertJsonPath('summary.remaining_count', 4)->assertJsonPath('summary.final_date', '2027-02-01')->assertJsonPath('scheduled.3.amount_cents', '10000');
        $this->getJson('/previews/payment?id='.$loan->id.'&amount=100')->assertJsonPath('after_cents', '90000')->assertJsonPath('remaining_count', 3)->assertJsonPath('final_date', '2027-01-01');
        $this->getJson('/previews/payment?id='.$loan->id.'&amount=1001')->assertUnprocessable();
    }

    public function test_twice_monthly_history_preserves_distinct_installments_on_the_same_date(): void
    {
        $this->travelTo(now('UTC')->setDate(2026, 3, 2)->setTime(12, 0));
        [$user, $house] = $this->household();
        $terms = ['name' => 'Two dates', 'balance' => '1000', 'balance_date' => '2026-02-01', 'scheduled' => true, 'installment' => '100', 'frequency' => 'twice_monthly', 'first_date' => '2026-02-01', 'day_one' => 30, 'day_two' => 31];
        $this->actingAs($user)->post('/loans', [...$terms, 'past_payments' => [['slot_key' => '0:0', 'due_date' => '2026-02-28', 'date' => '2026-02-28', 'amount' => '100'], ['slot_key' => '0:1', 'due_date' => '2026-02-28', 'date' => '2026-02-28', 'amount' => '100']]])->assertRedirect()->assertSessionHasNoErrors();
        $this->inHouse($house, function () {
            $this->assertSame(2, LoanPayment::count());
            $this->assertSame(2, Occurrence::where('due_date', '2026-02-28')->where('status', 'paid')->count());
            $this->assertSame(80000, (int) Account::firstOrFail()->balance_cents);
        });
        $this->postJson('/loans', [...$terms, 'past_payments' => [['slot_key' => '0:0', 'due_date' => '2026-02-28', 'date' => '2026-02-28', 'amount' => '100'], ['slot_key' => '0:0', 'due_date' => '2026-02-28', 'date' => '2026-02-28', 'amount' => '100']]])->assertUnprocessable();
        $this->inHouse($house, fn () => $this->assertSame(1, Loan::count()));
    }

    public function test_payment_corrections_update_accounts_and_preview_the_extended_tail(): void
    {
        $this->travelTo(now('UTC')->setDate(2026, 10, 10)->setTime(12, 0));
        [$user, $house] = $this->household();
        $this->actingAs($user)->post('/loans', ['name' => 'Loan', 'balance' => '1000', 'balance_date' => '2026-10-10', 'scheduled' => true, 'installment' => '250', 'frequency' => 'monthly', 'first_date' => '2026-11-01'])->assertSessionHasNoErrors();
        [$loan, $paying] = $this->inHouse($house, fn () => [Loan::firstOrFail(), Account::factory()->create()]);
        $this->post('/loans/'.$loan->id.'/payments', ['amount' => '500', 'payment_date' => '2026-10-10'])->assertSessionHasNoErrors();
        $payment = $this->inHouse($house, fn () => LoanPayment::firstOrFail());
        $this->getJson('/previews/payment?id='.$loan->id.'&payment_id='.$payment->id.'&amount=100')->assertJsonPath('after_cents', '90000')->assertJsonPath('remaining_count', 4)->assertJsonPath('final_date', '2027-02-01');
        $this->patch('/loan-payments/'.$payment->id, ['lock_version' => 1, 'amount' => '100', 'payment_date' => '2026-10-10', 'account_ids' => [$paying->id]])->assertSessionHasNoErrors();
        $this->getJson('/loans/'.$loan->id)->assertJsonPath('summary.final_date', '2027-02-01')->assertJsonPath('summary.remaining_count', 4);
        $this->inHouse($house, function () use ($payment, $paying, $loan) {
            $this->assertSame([$paying->id], $payment->fresh()->account_ids);
            $this->assertSame(90000, (int) Account::findOrFail($loan->account_id)->balance_cents);
        });
        $this->patchJson('/loan-payments/'.$payment->id, ['lock_version' => 1, 'amount' => '50', 'payment_date' => '2026-10-10'])->assertConflict();
    }

    public function test_investment_activity_is_paginated_deduplicated_and_excludes_hidden_or_deleted_rows(): void
    {
        [$user, $house] = $this->household();
        $account = $this->inHouse($house, function () {
            $account = Account::factory()->create(['type' => 'investment']);
            $snapshot = HoldingSnapshot::create(['account_id' => $account->id, 'observed_at' => now(), 'complete' => true, 'cash_cents' => null]);
            HoldingPosition::create(['snapshot_id' => $snapshot->id, 'security_key' => 'security', 'description' => 'Holding', 'quantity' => '2.5', 'market_value_cents' => 25000, 'cost_basis_cents' => null]);
            for ($index = 0; $index < 27; $index++) {
                $transaction = Transaction::create(['account_id' => $account->id, 'source' => 'provider', 'payee' => 'Purchase', 'amount_cents' => -1000, 'manual_classification' => 'investment_purchase', 'transaction_date' => '2026-10-01']);
            }
            InvestmentActivity::create(['account_id' => $account->id, 'external_key' => 'reported', 'transaction_id' => $transaction->id, 'activity_date' => '2026-10-01', 'kind' => 'investment_purchase', 'amount_cents' => -1000]);
            $transaction->update(['hidden' => true]);
            $deleted = Transaction::create(['account_id' => $account->id, 'source' => 'provider', 'payee' => 'Deleted', 'amount_cents' => 100, 'transaction_date' => '2026-10-01']);
            $deleted->delete();

            return $account;
        });
        $this->actingAs($user)->get('/investments?account='.$account->id.'&per_page=10')->assertInertia(fn (Assert $page) => $page->where('investment.account.id', $account->id)->where('investment.summary.holdings_cents', '25000')->where('investment.summary.gain_cents', null)->where('investment.summary.cash_cents', null)->where('investment.activity.total', 26)->has('investment.activity.data', 10));
        $this->get('/investments?account='.$account->id.'&per_page=10&activity_page=3')->assertInertia(fn (Assert $page) => $page->has('investment.activity.data', 6));
        $this->getJson('/investments?account=invalid')->assertUnprocessable();
    }

    public function test_history_resolves_categories_and_preserves_deleted_transaction_redaction(): void
    {
        [$user, $house] = $this->household();
        $transaction = $this->inHouse($house, function () {
            $category = Category::whereNotNull('parent_id')->firstOrFail();
            $transaction = Transaction::create(['account_id' => Account::factory()->create()->id, 'source' => 'manual', 'payee' => 'Private payee', 'category_id' => $category->id, 'amount_cents' => -1234, 'transaction_date' => '2026-10-01']);
            Audit::record($transaction, 'created');

            return $transaction;
        });
        $response = $this->actingAs($user)->getJson('/history/transactions/'.$transaction->id)->assertOk();
        $display = collect($response->json('data.0.display_changes'));
        $this->assertStringContainsString(' › ', $display->firstWhere('field', 'Category Id')['new']);
        $this->assertSame('−$12.34', $display->firstWhere('field', 'Amount')['new']);
        $this->delete('/transactions/'.$transaction->id, ['lock_version' => 1])->assertRedirect();
        $this->getJson('/history/transactions/'.$transaction->id)->assertJsonPath('data.0.changes.record.new', 'A deleted transaction')->assertDontSee('Private payee');
    }

    public function test_category_deletion_requires_a_replacement_and_member_edits_reject_stale_versions(): void
    {
        [$user, $house, $member] = $this->household();
        $category = $this->inHouse($house, fn () => Category::create(['name' => 'Test', 'name_normalized' => 'test', 'kind' => 'expense']));
        $this->actingAs($user)->deleteJson('/categories/'.$category->id, ['lock_version' => 1])->assertUnprocessable()->assertJsonValidationErrors('replacement_id');
        $this->getJson('/previews/category?id='.$category->id)->assertJsonPath('transactions', 0)->assertJsonPath('children', 0);
        $this->patch('/household/members/'.$member->id, ['lock_version' => 1, 'nickname' => 'Changed'])->assertSessionHasNoErrors();
        $this->patchJson('/household/members/'.$member->id, ['lock_version' => 1, 'nickname' => 'Stale'])->assertConflict();
        $this->assertSame('Changed', $member->fresh()->nickname);
    }

    public function test_correcting_a_credit_limit_keeps_the_original_value_in_history(): void
    {
        [$user, $house] = $this->household();
        $account = $this->inHouse($house, fn () => Account::factory()->create(['type' => 'credit_card']));
        $this->actingAs($user)->post('/accounts/'.$account->id.'/limit', ['lock_version' => 1, 'limit' => '1000', 'effective_date' => '2026-10-01'])->assertSessionHasNoErrors();
        $this->post('/accounts/'.$account->id.'/limit', ['lock_version' => 2, 'limit' => '1500', 'effective_date' => '2026-10-01'])->assertSessionHasNoErrors();
        $this->inHouse($house, function () {
            $event = AuditEvent::where('action', 'limit_corrected')->firstOrFail();
            $this->assertSame('100000', $event->changes['limit_cents']['old']);
            $this->assertSame('150000', $event->changes['limit_cents']['new']);
            $this->assertSame(1, CreditLimit::count());
        });
        $this->getJson('/history/accounts/'.$account->id)->assertJsonPath('data.0.action', 'limit_corrected')->assertJsonPath('data.0.display_changes.0.field', 'Limit');
    }

    public function test_investment_sync_imports_cash_activity_even_when_holdings_are_unsupported(): void
    {
        [$user, $house, $member] = $this->household();
        [$connection, $account, $run] = $this->inHouse($house, function () use ($member) {
            $authorization = ProviderAuthorization::create(['provider_user_key' => 'provider-user', 'authorizing_member_id' => $member->id, 'access_token' => 'test-token', 'refresh_token' => 'test-refresh', 'token_expires_at' => now()->addHour()]);
            $connection = Connection::create(['authorization_id' => $authorization->id, 'external_key' => 'broker', 'name' => 'Broker']);
            $account = Account::factory()->create(['connection_id' => $connection->id, 'type' => 'investment', 'source' => 'provider', 'provider_account_key' => 'investment', 'import_start_date' => '2026-10-01']);
            $run = SyncRun::create(['connection_id' => $connection->id, 'trigger' => 'manual', 'state' => 'queued']);

            return [$connection, $account, $run];
        });
        $base = config('finance.lunchflow_url');
        Http::preventStrayRequests();
        Http::fake([
            $base.'/accounts' => Http::response(['accounts' => [['id' => 'investment', 'connection_id' => 'broker', 'type' => 'investment', 'name' => 'Broker', 'currency' => 'USD']]]),
            $base.'/accounts/investment/transactions*' => Http::response(['transactions' => [['id' => 'purchase', 'date' => '2026-10-02', 'amount' => '-12.50', 'currency' => 'USD', 'description' => 'Purchase']]]),
            $base.'/accounts/investment/balance' => Http::response(['balance' => ['amount' => '100', 'currency' => 'USD']]),
            $base.'/accounts/investment/holdings' => Http::response(['error' => 'Not supported'], 501),
        ]);
        (new SyncConnection($house->id, $run->id))->handle(app(LunchFlow::class), app(Importer::class));
        $this->inHouse($house, function () use ($run, $account, $connection) {
            $this->assertSame('succeeded', $run->fresh()->state);
            $this->assertSame(10000, (int) $account->fresh()->balance_cents);
            $this->assertNotNull($connection->fresh()->last_full_success_at);
            $this->assertFalse(HoldingSnapshot::firstOrFail()->complete);
            $this->assertSame(1, Transaction::count());
        });
        $this->actingAs($user)->get('/investments')->assertInertia(fn (Assert $page) => $page->where('investment.summary.holdings_cents', null)->where('investment.activity.total', 1)->where('investment.activity.data.0.amount_cents', '-1250'));
    }

    public function test_household_creation_has_a_dedicated_page_and_existing_members_cannot_open_it(): void
    {
        $this->get('/setup/create')->assertRedirect('/sign-in');
        $this->actingAs(User::factory()->create())->get('/setup/create')->assertInertia(fn (Assert $page) => $page->component('Setup/Create'));
        [$user] = $this->household();
        $this->actingAs($user)->get('/setup/create')->assertRedirect('/home');
    }

    public function test_repayment_frequency_changes_match_the_preview_and_keep_unpaid_dates_in_order(): void
    {
        $this->travelTo(now('UTC')->setDate(2026, 10, 10)->setTime(12, 0));
        [$user, $house] = $this->household();
        $this->actingAs($user)->post('/loans', ['name' => 'Loan', 'balance' => '1000', 'balance_date' => '2026-10-10', 'scheduled' => true, 'installment' => '250', 'frequency' => 'monthly', 'first_date' => '2026-11-01'])->assertSessionHasNoErrors();
        $loan = $this->inHouse($house, fn () => Loan::firstOrFail());
        $query = ['id' => $loan->id, 'balance' => '1000', 'installment' => '250', 'frequency' => 'twice_monthly', 'first_date' => '2026-11-01', 'day_one' => 1, 'day_two' => 15];
        $preview = $this->getJson('/previews/loan?'.http_build_query($query))->assertOk()->assertJsonPath('final_date', '2026-12-15')->json('payments');
        $this->patch('/loans/'.$loan->id, ['lock_version' => $loan->lock_version, 'name' => 'Loan', 'scheduled' => true, 'repayment_total' => '1000', 'installment' => '250', 'frequency' => 'twice_monthly', 'first_date' => '2026-11-01', 'day_one' => 1, 'day_two' => 15])->assertSessionHasNoErrors();
        $this->getJson('/loans/'.$loan->id)->assertJsonPath('summary.final_date', '2026-12-15')->assertJsonPath('installments.data.0.due_date', '2026-11-01')->assertJsonPath('installments.data.1.due_date', '2026-11-15')->assertJsonPath('installments.data.2.due_date', '2026-12-01')->assertJsonPath('installments.data.3.due_date', '2026-12-15');
        $this->assertSame(['2026-11-01', '2026-11-15', '2026-12-01', '2026-12-15'], array_column($preview, 'date'));
    }

    public function test_holdings_totals_cover_every_page_and_foreign_investment_accounts_are_private(): void
    {
        [$user, $house] = $this->household();
        [, $foreign] = $this->household();
        $other = $this->inHouse($foreign, fn () => Account::factory()->create(['type' => 'investment']));
        $account = $this->inHouse($house, function () {
            $account = Account::factory()->create(['type' => 'investment']);
            $snapshot = HoldingSnapshot::create(['account_id' => $account->id, 'observed_at' => now(), 'complete' => true, 'cash_cents' => 1000]);
            for ($index = 0; $index < 12; $index++) {
                HoldingPosition::create(['snapshot_id' => $snapshot->id, 'security_key' => 'security-'.$index, 'description' => 'Holding '.$index, 'quantity' => '1', 'market_value_cents' => 100, 'cost_basis_cents' => 80]);
            }

            return $account;
        });
        $this->actingAs($user)->get('/investments?account='.$account->id.'&per_page=10')->assertInertia(fn (Assert $page) => $page->has('investment.positions.data', 10)->where('investment.positions.total', 12)->where('investment.summary.holdings_cents', '1200')->where('investment.summary.gain_cents', '240')->where('investment.summary.gain_percent', 25)->where('investment.summary.cash_cents', '1000'));
        $this->get('/investments?account='.$account->id.'&per_page=10&holdings_page=2')->assertInertia(fn (Assert $page) => $page->has('investment.positions.data', 2)->where('investment.summary.holdings_cents', '1200'));
        $this->getJson('/investments?account='.$other->id)->assertNotFound();
    }

    public function test_household_rename_does_not_overwrite_a_newer_shared_edit(): void
    {
        [$user, $house] = $this->household();
        $this->actingAs($user)->patch('/household', ['name' => 'New name', 'lock_version' => 1])->assertRedirect()->assertSessionHasNoErrors();
        $this->patchJson('/household', ['name' => 'Stale name', 'lock_version' => 1])->assertConflict();
        $this->assertSame('New name', $house->fresh()->name);
        $this->getJson('/context')->assertJsonPath('data_version', 2);
    }
}
