<?php

namespace Tests\Feature;

use App\Domain\Banking\AccountDiscovery;
use App\Domain\Banking\Importer;
use App\Domain\Banking\LunchFlow;
use App\Domain\Scheduling\Schedules;
use App\Jobs\SyncConnection;
use App\Models\Account;
use App\Models\Category;
use App\Models\Connection;
use App\Models\CreditLimit;
use App\Models\Invitation;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\Member;
use App\Models\Occurrence;
use App\Models\ProviderAuthorization;
use App\Models\Series;
use App\Models\SyncRun;
use App\Models\TargetOverride;
use App\Models\TargetPeriod;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\FinanceTestCase;

class DesignCoverageTest extends FinanceTestCase
{
    public function test_bill_type_filter_does_not_mix_income_or_subscriptions(): void
    {
        [$user, $house] = $this->household();
        $this->inHouse($house, function () {
            Series::factory()->create(['name' => 'Rent']);
            Series::factory()->create(['kind' => 'income', 'name' => 'Salary']);
            Series::factory()->create(['kind' => 'subscription', 'name' => 'Music']);
        });
        $this->actingAs($user)->get('/bills')->assertOk()->assertInertia(fn (Assert $view) => $view->where('section', 'bills')->has('records.data', 1)->where('records.data.0.name', 'Rent'));
        $this->get('/income')->assertOk()->assertInertia(fn (Assert $view) => $view->where('section', 'income')->has('records.data', 1)->where('records.data.0.name', 'Salary'));
        $this->get('/bills?kind=income')->assertRedirectToRoute('income');
        $this->get('/bills?kind=invalid')->assertSessionHasErrors('kind');
    }

    public function test_subscription_summary_includes_other_pages_and_detail_uses_completion_year(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 4)->setTime(12, 0));
        [$user, $house] = $this->household();
        $series = $this->inHouse($house, function () {
            $first = null;
            for ($i = 0; $i < 12; $i++) {
                $s = Series::factory()->create(['kind' => 'subscription', 'amount_cents' => 1000, 'name' => sprintf('Music %02d', $i)]);
                $first ??= $s;
            }
            app(Schedules::class)->materialize($first, '2027-01-01');
            Occurrence::where('series_id', $first->id)->orderBy('slot_order')->first()->update(['status' => 'paid', 'completed_date' => '2026-10-03']);

            return $first;
        });
        $this->actingAs($user)->get('/subscriptions?per_page=10')->assertInertia(fn (Assert $view) => $view->has('records.data', 10)->where('summary.active_count', 12)->where('summary.monthly_estimate_cents', '12000'));
        $this->getJson('/schedules/'.$series->id.'?per_page=10')->assertOk()->assertJsonPath('summary.paid_total_cents', '1000')->assertJsonPath('summary.paid_year_cents', '1000')->assertJsonCount(13, 'chart')->assertJsonCount(2, 'payments.data')->assertJsonPath('payments.data.0.due_date', '2026-11-01')->assertJsonPath('chart.11.paid_cents', '1000');
    }

    public function test_shared_setup_checklist_can_be_dismissed_by_an_ordinary_member(): void
    {
        [, $house] = $this->household();
        $memberUser = User::factory()->create();
        Member::create(['household_id' => $house->id, 'user_id' => $memberUser->id, 'nickname' => 'Member']);
        $this->actingAs($memberUser)->get('/home')->assertInertia(fn (Assert $view) => $view->where('setup.members', true)->where('household.member_count', 2));
        $this->post('/home/setup/dismiss')->assertRedirect();
        $this->get('/home')->assertInertia(fn (Assert $view) => $view->where('setup', null));
    }

    public function test_ordinary_member_configures_and_disconnects_connections_without_removing_history(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 4)->setTime(12, 0));
        [, $house] = $this->household();
        $user = User::factory()->create(['timezone' => 'Pacific/Honolulu']);
        Member::create(['household_id' => $house->id, 'user_id' => $user->id, 'nickname' => 'Member']);
        [$connection, $account, $transaction] = $this->inHouse($house, function () {
            $connection = Connection::create(['name' => 'Bank', 'external_key' => 'bank']);
            $account = Account::factory()->create(['source' => 'provider', 'connection_id' => $connection->id, 'provider_account_key' => 'account', 'import_start_date' => null]);
            $transaction = Transaction::create(['account_id' => $account->id, 'source' => 'provider', 'payee' => 'Old history', 'amount_cents' => -1000, 'transaction_date' => '2026-09-01']);

            return [$connection, $account, $transaction];
        });
        $this->actingAs($user)->getJson('/connections/'.$connection->id)->assertOk()->assertJsonPath('default_start_date', '2026-10-01');
        $this->postJson('/connections/'.$connection->id.'/sync')->assertUnprocessable();
        $this->patch('/connections/'.$connection->id, ['lock_version' => 1, 'name' => 'Shared bank', 'accounts' => [['id' => $account->id, 'import_start_date' => '2026-10-02']]])->assertRedirect();
        $this->inHouse($house, function () use ($account, $transaction) {
            $this->assertSame('2026-10-02', $account->fresh()->import_start_date);
            $this->assertSame(1, SyncRun::count());
            $this->assertNotNull($transaction->fresh());
        });
        $this->delete('/connections/'.$connection->id)->assertRedirect();
        $this->inHouse($house, function () use ($connection, $transaction) {
            $this->assertSame('disconnected', $connection->fresh()->state);
            $this->assertNotNull($transaction->fresh());
        });
    }

    public function test_connection_import_configuration_rejects_foreign_accounts_and_stale_versions(): void
    {
        [$user, $house] = $this->household();
        [, $foreign] = $this->household();
        $connection = $this->inHouse($house, fn () => Connection::create(['name' => 'Bank', 'external_key' => 'bank']));
        $account = $this->inHouse($foreign, fn () => Account::factory()->create());
        $this->actingAs($user)->getJson('/connections/'.Str::uuid())->assertNotFound();
        $this->patchJson('/connections/'.$connection->id, ['lock_version' => 1, 'name' => 'Bank', 'accounts' => [['id' => $account->id, 'import_start_date' => '2026-10-01']]])->assertNotFound();
        $this->patchJson('/connections/'.$connection->id, ['lock_version' => 2, 'name' => 'Bank', 'accounts' => []])->assertConflict();
    }

    public function test_account_discovery_uses_utc_date_for_later_accounts_and_does_not_restore_tombstones(): void
    {
        $this->travelTo(now('UTC')->setDate(2026, 10, 4)->setTime(0, 30));
        [, $house, $member] = $this->household();
        $this->inHouse($house, function () use ($member) {
            $authorization = ProviderAuthorization::create(['provider_user_key' => 'provider-user', 'authorizing_member_id' => $member->id, 'access_token' => 'test-token', 'refresh_token' => 'test-refresh', 'token_expires_at' => now()->addHour()]);
            $row = ['id' => 'first', 'connection_id' => 'bank', 'name' => 'Checking', 'currency' => 'USD'];
            $service = app(AccountDiscovery::class);
            $service->discover($authorization, [$row], true);
            $first = Account::firstOrFail();
            $this->assertNull($first->import_start_date);
            $service->discover($authorization, [[...$row, 'id' => 'later']], false, 'bank');
            $this->assertSame('2026-10-04', Account::where('provider_account_key', 'later')->firstOrFail()->import_start_date);
            $first->delete();
            $service->discover($authorization, [$row], false, 'bank');
            $this->assertSame(1, Account::count());
            $this->assertSame(2, Account::withTrashed()->count());
        });
    }

    public function test_existing_loan_entry_preserves_paid_slots_and_an_unpaid_past_installment(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 4)->setTime(12, 0));
        [$user, $house] = $this->household();
        $this->actingAs($user)->post('/loans', ['name' => 'Existing car loan', 'balance' => '1000', 'balance_date' => '2026-08-01', 'scheduled' => true, 'installment' => '250', 'frequency' => 'monthly', 'first_date' => '2026-08-01', 'past_payments' => [['due_date' => '2026-08-01', 'date' => '2026-08-02', 'amount' => '250']]])->assertRedirect()->assertSessionHasNoErrors();
        $loan = $this->inHouse($house, function () {
            $loan = Loan::firstOrFail();
            $this->assertSame(75000, (int) Account::find($loan->account_id)->balance_cents);
            $this->assertSame('paid', Occurrence::where('due_date', '2026-08-01')->firstOrFail()->status);
            $this->assertSame('unpaid', Occurrence::where('due_date', '2026-09-01')->firstOrFail()->status);
            $this->assertSame('installment', LoanPayment::firstOrFail()->kind);

            return $loan;
        });
        $this->getJson('/loans/'.$loan->id)->assertOk()->assertJsonCount(3, 'scheduled')->assertJsonPath('payments.data.0.payment_date', '2026-08-02');
        $this->postJson('/loans', ['name' => 'Invalid history', 'balance' => '100', 'balance_date' => '2026-10-04', 'scheduled' => true, 'installment' => '25', 'frequency' => 'monthly', 'first_date' => '2026-08-01', 'past_payments' => [['date' => '2026-08-01', 'amount' => '101']]])->assertUnprocessable()->assertJsonValidationErrors('past_payments');
    }

    public function test_nesting_a_category_removes_current_and_future_targets_but_retains_past_targets(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 4)->setTime(12, 0));
        [$user, $house] = $this->household();
        [$category, $parent] = $this->inHouse($house, function () {
            $category = Category::create(['name' => 'Hobby', 'name_normalized' => 'hobby', 'kind' => 'expense']);
            $parent = Category::create(['name' => 'Leisure', 'name_normalized' => 'leisure', 'kind' => 'expense']);
            TargetPeriod::create(['category_id' => $category->id, 'start_month' => '2026-08-01', 'target_cents' => 10000]);
            TargetOverride::create(['category_id' => $category->id, 'month' => '2026-09-01', 'target_cents' => 5000]);
            TargetOverride::create(['category_id' => $category->id, 'month' => '2026-11-01', 'target_cents' => 20000]);

            return [$category, $parent];
        });
        $this->actingAs($user)->patch('/categories/'.$category->id, ['lock_version' => 1, 'name' => 'Hobby', 'kind' => 'expense', 'parent_id' => $parent->id])->assertRedirect()->assertSessionHasNoErrors();
        $this->inHouse($house, function () use ($category, $parent) {
            $this->assertSame($parent->id, $category->fresh()->parent_id);
            $this->assertSame('2026-10-01', TargetPeriod::firstOrFail()->end_month);
            $this->assertSame(['2026-09-01'], TargetOverride::pluck('month')->all());
        });
        $this->get('/budget?month=2026-09')->assertInertia(fn (Assert $view) => $view->has('records', 1)->where('records.0.id', $category->id)->where('records.0.name', 'Hobby (historical target)')->where('records.0.target_cents', '5000'));
    }

    public function test_account_chart_retains_recent_observations_beyond_one_thousand_rows(): void
    {
        [$user, $house] = $this->household();
        $this->inHouse($house, function () {
            $account = Account::factory()->create();
            $rows = [];
            for ($i = 0; $i < 1002; $i++) {
                $rows[] = ['id' => (string) Str::uuid(), 'household_id' => $account->household_id, 'account_id' => $account->id, 'kind' => 'manual_update', 'balance_cents' => $i, 'effective_date' => '2026-10-01', 'created_at' => now(), 'updated_at' => now()];
            }
            DB::table('account_balance_events')->insert($rows);
        });
        $this->actingAs($user)->get('/accounts')->assertInertia(fn (Assert $view) => $view->has('history', 1002));
    }

    public function test_transaction_detail_supports_attachment_from_transaction_and_rejects_foreign_reads(): void
    {
        [$user, $house] = $this->household();
        [, $foreign] = $this->household();
        [$transaction, $occurrence] = $this->inHouse($house, function () {
            $account = Account::factory()->create();
            $t = Transaction::create(['account_id' => $account->id, 'source' => 'manual', 'payee' => 'Rent', 'amount_cents' => -10000, 'transaction_date' => '2026-10-01']);
            $s = Series::factory()->create(['name' => 'Rent', 'frequency' => 'once']);
            app(Schedules::class)->materialize($s, '2026-10-31');

            return [$t, Occurrence::where('series_id', $s->id)->firstOrFail()];
        });
        $foreignTransaction = $this->inHouse($foreign, fn () => Transaction::create(['account_id' => Account::factory()->create()->id, 'source' => 'manual', 'payee' => 'Private', 'amount_cents' => -100, 'transaction_date' => '2026-10-01']));
        $this->actingAs($user)->getJson('/transactions/'.$foreignTransaction->id)->assertNotFound();
        $this->getJson('/transactions/'.$transaction->id.'/occurrences?search=Rent')->assertOk()->assertJsonPath('data.0.id', $occurrence->id);
        $this->post('/occurrences/'.$occurrence->id.'/attachments', ['transaction_id' => $transaction->id])->assertRedirect();
        $this->getJson('/transactions/'.$transaction->id)->assertOk()->assertJsonPath('attachments.0.occurrence.status', 'unpaid');
        $this->getJson('/occurrences/'.$occurrence->id.'/transactions')->assertJsonPath('data.0.attached_occurrence_id', $occurrence->id);
    }

    public function test_card_settings_create_unknown_statement_and_fee_schedule_with_limit_history(): void
    {
        [$user, $house] = $this->household();
        $this->actingAs($user)->post('/accounts', ['name' => 'Card', 'type' => 'credit_card', 'balance' => '500', 'balance_date' => '2026-10-01', 'limit' => '2000', 'limit_date' => '2026-10-01', 'fee' => '50', 'fee_cadence' => 'yearly', 'next_fee_date' => '2026-11-01', 'due_day' => 15, 'statement_enabled' => true, 'first_statement_date' => '2026-10-15', 'fee_enabled' => true])->assertRedirect()->assertSessionHasNoErrors();
        $this->inHouse($house, function () {
            $this->assertSame(2, Series::count());
            $statement = Series::where('generated_purpose', 'statement')->firstOrFail();
            $this->assertNull(Occurrence::where('series_id', $statement->id)->firstOrFail()->amount_cents);
            $this->assertSame(200000, (int) CreditLimit::firstOrFail()->limit_cents);
            $this->assertSame(50000, (int) Account::firstOrFail()->balance_cents);
        });
        [$statement, $anchor] = $this->inHouse($house, function () {
            $statement = Series::where('generated_purpose', 'statement')->firstOrFail();

            return [$statement, Occurrence::where('series_id', $statement->id)->orderBy('due_date')->firstOrFail()];
        });
        $this->patch('/schedules/'.$statement->id, ['lock_version' => $statement->lock_version, 'name' => 'Card statement renamed', 'kind' => 'bill', 'amount' => null, 'frequency' => $statement->frequency, 'first_date' => $statement->first_date, 'account_ids' => $anchor->account_ids, 'recipient_ids' => [], 'scope' => 'future', 'anchor_id' => $anchor->id])->assertRedirect()->assertSessionHasNoErrors();
        $this->inHouse($house, fn () => $this->assertNull($anchor->fresh()->amount_cents));
    }

    public function test_future_price_edits_update_current_lists_without_clearing_unchanged_overrides(): void
    {
        $this->travelTo(now('UTC')->setDate(2026, 10, 4)->setTime(12, 0));
        [$user, $house] = $this->household();
        [$series, $anchor, $later] = $this->inHouse($house, function () {
            $s = Series::factory()->create(['name' => 'Streaming', 'kind' => 'subscription', 'amount_cents' => 1000]);
            app(Schedules::class)->materialize($s, '2026-12-31');
            $items = Occurrence::where('series_id', $s->id)->orderBy('slot_order')->get();

            return [$s, $items[0], $items[1]];
        });
        $input = ['name' => 'Streaming Plus', 'kind' => 'subscription', 'amount' => '15', 'frequency' => 'monthly', 'first_date' => '2026-10-01', 'account_ids' => [], 'recipient_ids' => [], 'scope' => 'future', 'anchor_id' => $anchor->id];
        $this->actingAs($user)->patch('/schedules/'.$series->id, ['lock_version' => 1, ...$input])->assertRedirect()->assertSessionHasNoErrors();
        $this->inHouse($house, function () use ($series, $later) {
            app(Schedules::class)->edit($series->fresh(), $later->fresh(), ['amount_cents' => 2000], 'occurrence');
        });
        $this->patch('/schedules/'.$series->id, ['lock_version' => 3, ...$input, 'name' => 'Streaming Ultimate'])->assertRedirect()->assertSessionHasNoErrors();
        $this->get('/subscriptions?search=Ultimate')->assertInertia(fn (Assert $view) => $view->has('records.data', 1)->where('records.data.0.name', 'Streaming Ultimate')->where('records.data.0.amount_cents', '1500')->where('summary.monthly_estimate_cents', '1500'));
        $this->inHouse($house, function () use ($later) {
            $this->assertSame(2000, (int) $later->fresh()->amount_cents);
            $this->assertTrue($later->fresh()->overrides['amount_cents']);
        });
    }

    public function test_loan_projection_reaches_payoff_beyond_the_calendar_materialization_window(): void
    {
        $this->travelTo(now('UTC')->setDate(2026, 10, 4)->setTime(12, 0));
        [$user, $house] = $this->household();
        $this->actingAs($user)->post('/loans', ['name' => 'Long repayment', 'balance' => '5000', 'balance_date' => '2026-10-04', 'scheduled' => true, 'installment' => '100', 'frequency' => 'monthly', 'first_date' => '2026-11-01'])->assertRedirect()->assertSessionHasNoErrors();
        $id = $this->inHouse($house, fn () => Loan::firstOrFail()->id);
        $this->getJson('/loans/'.$id)->assertOk()->assertJsonCount(50, 'scheduled')->assertJsonPath('scheduled.49.due_date', '2030-12-01');
    }

    public function test_invitation_review_reveals_only_metadata_and_initializes_first_join_timezone(): void
    {
        [, $house, $owner] = $this->household();
        $guest = User::factory()->create(['timezone' => 'America/Chicago']);
        $other = User::factory()->create();
        $invite = Invitation::create(['household_id' => $house->id, 'target_email' => $guest->email, 'invited_by_member_id' => $owner->id, 'status' => 'pending']);
        $this->actingAs($other)->getJson('/invitations/'.$invite->id)->assertNotFound();
        $this->actingAs($guest)->getJson('/invitations/'.$invite->id)->assertOk()->assertJsonPath('household', $house->name)->assertJsonPath('inviter', 'Owner')->assertJsonCount(1, 'members')->assertJsonMissingPath('accounts')->assertJsonMissingPath('transactions');
        $this->get('/accounts')->assertRedirect('/setup');
        $this->post('/invitations/'.$invite->id.'/accept', ['timezone' => 'Pacific/Honolulu'])->assertRedirect('/home');
        $this->assertSame('Pacific/Honolulu', $guest->fresh()->timezone);
        $this->getJson('/invitations/'.$invite->id)->assertNotFound();
    }

    public function test_sync_discovers_later_accounts_and_preserves_success_when_another_account_fails(): void
    {
        $this->travelTo(now('UTC')->setDate(2026, 10, 4)->setTime(12, 0));
        [, $house, $member] = $this->household();
        [$connection, $run] = $this->inHouse($house, function () use ($member) {
            $auth = ProviderAuthorization::create(['provider_user_key' => 'test-provider', 'authorizing_member_id' => $member->id, 'access_token' => 'test-token', 'refresh_token' => 'test-refresh', 'token_expires_at' => now()->addHour()]);
            $connection = Connection::create(['authorization_id' => $auth->id, 'external_key' => 'bank', 'name' => 'Bank']);
            Account::factory()->create(['connection_id' => $connection->id, 'source' => 'provider', 'provider_account_key' => 'existing', 'import_start_date' => '2026-10-01']);
            $run = SyncRun::create(['connection_id' => $connection->id, 'trigger' => 'manual', 'state' => 'queued']);

            return [$connection, $run];
        });
        Http::preventStrayRequests();
        $base = config('finance.lunchflow_url');
        Http::fake([
            $base.'/accounts' => Http::response(['accounts' => [['id' => 'existing', 'connection_id' => 'bank', 'name' => 'Existing', 'currency' => 'USD'], ['id' => 'later', 'connection_id' => 'bank', 'name' => 'Later', 'currency' => 'USD']]]),
            $base.'/accounts/existing/transactions*' => Http::response(['transactions' => [['id' => 'eligible', 'date' => '2026-10-01', 'amount' => '-12.50', 'currency' => 'USD', 'description' => 'Imported'], ['id' => 'too-old', 'date' => '2026-09-30', 'amount' => '-10', 'currency' => 'USD']]]),
            $base.'/accounts/existing/balance' => Http::response(['balance' => ['amount' => '100', 'currency' => 'USD']]),
            $base.'/accounts/later/transactions*' => Http::response([], 500),
        ]);
        (new SyncConnection($house->id, $run->id))->handle(app(LunchFlow::class), app(Importer::class));
        $this->inHouse($house, function () use ($run, $connection) {
            $this->assertSame('partial', $run->fresh()->state);
            $this->assertNull($connection->fresh()->last_full_success_at);
            $this->assertSame('2026-10-04', Account::where('provider_account_key', 'later')->firstOrFail()->import_start_date);
            $this->assertSame('sync_failed', Account::where('provider_account_key', 'later')->firstOrFail()->latest_error);
            $this->assertSame(10000, (int) Account::where('provider_account_key', 'existing')->firstOrFail()->balance_cents);
            $this->assertSame(1, Transaction::count());
            $this->assertSame('Imported', Transaction::firstOrFail()->payee);
        });
    }

    public function test_transaction_category_filter_includes_subcategories_and_uncategorized_has_its_own_view(): void
    {
        [$user, $house] = $this->household();
        $root = $this->inHouse($house, function () {
            $root = Category::where('name', 'Groceries')->firstOrFail();
            $child = Category::where('parent_id', $root->id)->firstOrFail();
            $account = Account::factory()->create();
            foreach ([$root->id, $child->id, null] as $id) {
                Transaction::create(['account_id' => $account->id, 'category_id' => $id, 'source' => 'manual', 'payee' => 'Expense', 'amount_cents' => -100, 'transaction_date' => '2026-10-01']);
            }

            return $root;
        });
        $this->actingAs($user)->get('/transactions?category='.$root->id)->assertInertia(fn (Assert $view) => $view->has('records.data', 2));
        $this->get('/transactions?category=uncategorized')->assertInertia(fn (Assert $view) => $view->has('records.data', 1)->where('records.data.0.category_id', null));
        $this->getJson('/transactions?category='.Str::uuid())->assertNotFound();
    }

    public function test_notification_pagination_read_unread_and_dismiss_preserve_history(): void
    {
        [$user, $house] = $this->household();
        $id = null;
        for ($i = 0; $i < 12; $i++) {
            $id = (string) Str::uuid();
            DB::table('notifications')->insert(['id' => $id, 'user_id' => $user->id, 'household_id' => $house->id, 'kind' => 'reminder', 'deduplication_key' => 'test:'.$id, 'data' => json_encode(['title' => 'Payment reminder']), 'created_at' => now()->addSeconds($i), 'updated_at' => now()]);
        }
        $this->actingAs($user)->get('/notifications?per_page=10')->assertInertia(fn (Assert $view) => $view->has('records.data', 10)->where('records.total', 12));
        $this->post('/notifications/'.$id.'/read')->assertRedirect();
        $this->assertNotNull(DB::table('notifications')->where('id', $id)->value('read_at'));
        $this->post('/notifications/'.$id.'/read', ['unread' => true])->assertRedirect();
        $this->assertNull(DB::table('notifications')->where('id', $id)->value('read_at'));
        $this->post('/notifications/'.$id.'/dismiss')->assertRedirect();
        $this->get('/notifications?filter=dismissed')->assertInertia(fn (Assert $view) => $view->has('records.data', 1)->where('records.data.0.id', $id));
        $this->assertSame(12, DB::table('notifications')->where('user_id', $user->id)->count());
        $this->get('/notifications?per_page=100')->assertSessionHasErrors('per_page');
    }
}
