<?php

namespace Tests\Feature;

use App\Domain\Scheduling\Schedules;
use App\Models\Account;
use App\Models\BalanceEvent;
use App\Models\Category;
use App\Models\Loan;
use App\Models\Member;
use App\Models\Occurrence;
use App\Models\Series;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\FinanceTestCase;

class FinanceTest extends FinanceTestCase
{
    #[TestWith(['bill'])]
    #[TestWith(['subscription'])]
    public function test_bill_suggestions_search_all_household_accounts_without_paying_account_assignments(string $kind): void
    {
        [$user, $house] = $this->household();
        [, $foreignHouse] = $this->household();
        [$occurrence, $firstTransaction, $secondTransaction] = $this->inHouse($house, function () use ($kind): array {
            $firstAccount = Account::factory()->create();
            $secondAccount = Account::factory()->create();
            $series = Series::factory()->create(['kind' => $kind, 'frequency' => 'once']);
            app(Schedules::class)->materialize($series, '2026-10-01');
            $occurrence = Occurrence::where('series_id', $series->id)->firstOrFail();
            $values = ['source' => 'manual', 'amount_cents' => -10000, 'transaction_date' => '2026-10-01', 'payee' => 'Rent'];
            $firstTransaction = Transaction::create(['account_id' => $firstAccount->id, ...$values]);
            $secondTransaction = Transaction::create(['account_id' => $secondAccount->id, ...$values, 'transaction_date' => '2026-10-08']);
            Transaction::create(['account_id' => $firstAccount->id, ...$values, 'hidden' => true]);
            Transaction::create(['account_id' => $firstAccount->id, ...$values, 'transaction_date' => '2026-10-09']);
            Transaction::create(['account_id' => $firstAccount->id, ...$values, 'amount_cents' => 10000]);

            return [$occurrence, $firstTransaction, $secondTransaction];
        });
        $this->inHouse($foreignHouse, function (): void {
            $account = Account::factory()->create();
            Transaction::create(['account_id' => $account->id, 'source' => 'manual', 'amount_cents' => -10000, 'transaction_date' => '2026-10-01', 'payee' => 'Private rent']);
        });

        $this->actingAs($user)->getJson('/occurrences/'.$occurrence->id)->assertOk()
            ->assertJsonCount(2, 'suggestions')->assertJsonPath('suggestions.0.id', $firstTransaction->id)
            ->assertJsonPath('suggestions.1.id', $secondTransaction->id)->assertDontSee('Private rent');
        $this->inHouse($house, fn () => $occurrence->update(['account_ids' => [$firstTransaction->account_id]]));
        $this->getJson('/occurrences/'.$occurrence->id)->assertOk()->assertJsonCount(2, 'suggestions');
        $this->post('/occurrences/'.$occurrence->id.'/attachments', ['transaction_id' => $firstTransaction->id])->assertRedirect();
        $this->getJson('/occurrences/'.$occurrence->id)->assertOk()->assertJsonCount(1, 'suggestions')
            ->assertJsonPath('suggestions.0.id', $secondTransaction->id);
    }

    #[TestWith(['bill'])]
    #[TestWith(['subscription'])]
    public function test_bill_creation_and_edits_ignore_paying_account_selection(string $kind): void
    {
        $this->withoutExceptionHandling();
        [$user, $house] = $this->household();
        $account = $this->inHouse($house, fn () => Account::factory()->create());
        $values = ['name' => 'Rent', 'kind' => $kind, 'amount' => '100', 'frequency' => 'once', 'first_date' => '2026-10-01', 'account_ids' => [$account->id]];

        $this->actingAs($user)->post('/schedules', $values)->assertRedirect()->assertSessionHasNoErrors();
        [$series, $occurrence] = $this->inHouse($house, function (): array {
            $series = Series::firstOrFail();
            $occurrence = Occurrence::where('series_id', $series->id)->firstOrFail();
            $this->assertSame([], $series->account_ids);
            $this->assertSame([], $occurrence->account_ids);

            return [$series, $occurrence];
        });
        $this->patch('/schedules/'.$series->id, [...$values, 'name' => 'Updated rent', 'lock_version' => $series->lock_version, 'anchor_id' => $occurrence->id, 'scope' => 'future'])
            ->assertRedirect()->assertSessionHasNoErrors();
        $this->inHouse($house, function () use ($occurrence): void {
            $this->assertSame('Updated rent', $occurrence->fresh()->name);
            $this->assertSame([], $occurrence->fresh()->account_ids);
        });
    }

    public function test_guests_and_users_without_a_household_cannot_read_financial_pages(): void
    {
        $this->get('/accounts')->assertRedirect('/sign-in');
        $this->actingAs(User::factory()->create())->get('/profile')->assertRedirect('/setup');
    }

    public function test_all_financial_pages_render_for_a_member(): void
    {
        [$user] = $this->household();
        foreach (['home', 'budget', 'bills', 'income', 'subscriptions', 'accounts', 'loans', 'transactions', 'categories', 'household', 'profile', 'notifications', 'investments'] as $page) {
            $this->actingAs($user)->get('/'.$page)->assertOk()->assertInertia(fn (Assert $view) => $view->component('Finance/Index')->where('section', $page)->has('household.id'));
        }
    }

    public function test_cross_household_records_and_relation_payloads_return_404(): void
    {
        [$owner,$house] = $this->household();
        [, $foreign] = $this->household();
        $account = $this->inHouse($foreign, fn () => Account::factory()->create());
        $this->actingAs($owner)->getJson('/accounts/'.$account->id)->assertNotFound();
        $category = $this->inHouse($foreign, fn () => Category::first());
        $this->post('/schedules', ['name' => 'Cross tenant', 'kind' => 'bill', 'amount' => '10.00', 'frequency' => 'once', 'first_date' => '2026-10-12', 'category_id' => $category->id])->assertNotFound();
    }

    public function test_runtime_role_cannot_read_another_household_without_context(): void
    {
        [, $house] = $this->household();
        [, $foreign] = $this->household();
        $this->inHouse($house, fn () => Account::factory()->create());
        $this->inHouse($foreign, fn () => Account::factory()->create());
        $this->artisan('app:grant')->assertExitCode(0);
        DB::statement('SET LOCAL ROLE finance_app');
        DB::select("select set_config('app.household_id','',true)");
        $this->assertSame(0, DB::table('accounts')->count());
        $this->inHouse($house, function () {
            $this->assertSame(1, DB::table('accounts')->count());
        });
        DB::statement('RESET ROLE');
    }

    public function test_manual_transaction_changes_balance_once_and_edits_and_deletion_do_not_reverse_it(): void
    {
        [$user,$house] = $this->household();
        $a = $this->inHouse($house, fn () => Account::factory()->create());
        $command = (string) Str::uuid();
        $data = ['command_key' => $command, 'account_id' => $a->id, 'payee' => 'Groceries', 'amount' => '25.50', 'direction' => 'out', 'transaction_date' => '2026-10-02', 'update_balance' => true];
        $this->actingAs($user)->post('/transactions', $data)->assertRedirect();
        $this->post('/transactions', $data)->assertRedirect();
        $this->inHouse($house, function () use ($a) {
            $this->assertSame(97450, (int) $a->fresh()->balance_cents);
            $this->assertSame(1, Transaction::count());
            $this->assertSame(1, BalanceEvent::where('kind', 'transaction')->count());
        });
        $t = $this->inHouse($house, fn () => Transaction::first());
        $this->patch('/transactions/'.$t->id, ['lock_version' => 1, 'payee' => 'Corrected', 'amount' => '30.00', 'direction' => 'out', 'transaction_date' => '2026-10-03'])->assertRedirect();
        $this->delete('/transactions/'.$t->id, ['lock_version' => 2])->assertRedirect();
        $this->inHouse($house, fn () => $this->assertSame(97450, (int) $a->fresh()->balance_cents));
    }

    public function test_debt_account_outflow_increases_debt_and_stale_balance_saves_return_409(): void
    {
        [$user,$house] = $this->household();
        $a = $this->inHouse($house, fn () => Account::factory()->create(['type' => 'credit_card', 'balance_cents' => 50000]));
        $this->actingAs($user)->post('/transactions', ['account_id' => $a->id, 'payee' => 'Purchase', 'amount' => '100', 'direction' => 'out', 'transaction_date' => '2026-10-02'])->assertRedirect();
        $this->inHouse($house, fn () => $this->assertSame(60000, (int) $a->fresh()->balance_cents));
        $this->postJson('/accounts/'.$a->id.'/balance', ['lock_version' => 1, 'balance' => '1', 'balance_date' => '2026-10-01'])->assertConflict();
    }

    public function test_member_can_edit_finances_but_cannot_administer_and_removal_revokes_access(): void
    {
        [$owner,$house] = $this->household();
        $user = User::factory()->create();
        $member = Member::create(['household_id' => $house->id, 'user_id' => $user->id, 'nickname' => 'Member']);
        $this->actingAs($user)->post('/accounts', ['name' => 'Cash', 'type' => 'cash', 'balance' => '100', 'balance_date' => '2026-10-01'])->assertRedirect();
        $this->post('/household/invitations', ['email' => 'new@example.com'])->assertForbidden();
        $this->actingAs($owner)->delete('/household/members/'.$member->id)->assertRedirect();
        $this->actingAs($user)->getJson('/context')->assertForbidden()->assertJsonPath('code', 'household_access_revoked');
    }

    public function test_live_attachment_claim_is_unique_released_on_occurrence_deletion_and_deleted_details_are_redacted(): void
    {
        [$user,$house] = $this->household();
        [$a,$o,$other,$t] = $this->inHouse($house, function () {
            $a = Account::factory()->create();
            $s = Series::factory()->create(['frequency' => 'once']);
            app(Schedules::class)->materialize($s, '2026-10-02');
            $o = Occurrence::first();
            $s2 = Series::factory()->create(['frequency' => 'once']);
            app(Schedules::class)->materialize($s2, '2026-10-02');
            $other = Occurrence::where('series_id', $s2->id)->first();
            $t = Transaction::create(['account_id' => $a->id, 'source' => 'manual', 'amount_cents' => -10000, 'transaction_date' => '2026-10-01', 'payee' => 'Private merchant']);

            return [$a, $o, $other, $t];
        });
        $this->actingAs($user)->post('/occurrences/'.$o->id.'/attachments', ['transaction_id' => $t->id])->assertRedirect();
        $this->post('/occurrences/'.$other->id.'/attachments', ['transaction_id' => $t->id])->assertConflict();
        $this->inHouse($house, fn () => $o->delete());
        $this->post('/occurrences/'.$other->id.'/attachments', ['transaction_id' => $t->id])->assertRedirect();
        $this->delete('/transactions/'.$t->id, ['lock_version' => 1])->assertRedirect();
        $this->getJson('/occurrences/'.$other->id)->assertOk()->assertJsonPath('attachments.0.display_state', 'deleted')->assertDontSee('Private merchant');
        $this->getJson('/history/transactions/'.$t->id)->assertOk()->assertDontSee('Private merchant');
    }

    public function test_budget_uses_signed_transactions_refunds_and_exclusions_and_alerts_once(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(12, 0));
        [$user,$house] = $this->household();
        [$a,$c] = $this->inHouse($house, fn () => [Account::factory()->create(), Category::where('name', 'Groceries')->first()]);
        $this->actingAs($user)->post('/budget/targets', ['category_id' => $c->id, 'month' => '2026-10', 'amount' => '100', 'scope' => 'future'])->assertRedirect();
        foreach ([['Store', '120', 'out', null], ['Refund', '30', 'in', null], ['Transfer', '1000', 'out', 'transfer']] as [$payee,$amount,$direction,$classification]) {
            $this->post('/transactions', ['account_id' => $a->id, 'payee' => $payee, 'amount' => $amount, 'direction' => $direction, 'transaction_date' => '2026-10-02', 'category_id' => $c->id, 'update_balance' => false])->assertRedirect();
            if ($classification) {
                $t = $this->inHouse($house, fn () => Transaction::where('payee', $payee)->first());
                $this->patch('/transactions/'.$t->id, ['lock_version' => 1, 'manual_classification' => $classification])->assertRedirect();
            }
        }
        $this->get('/budget?month=2026-10')->assertInertia(fn (Assert $p) => $p->where('records.0.spent_cents', '9000')->where('records.0.target_cents', '10000')->where('records.0.remaining_cents', '1000'));
        $this->assertSame(1, DB::table('budget_alerts')->where('household_id', $house->id)->count());
        $this->assertSame(1, DB::table('notifications')->where('user_id', $user->id)->where('kind', 'budget')->count());
        $this->postJson('/budget/targets', ['category_id' => $c->id, 'month' => '2026-09', 'amount' => '10', 'scope' => 'month'])->assertUnprocessable();
    }

    public function test_loan_allocates_exact_final_installment_extra_payment_and_reversal(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(12, 0));
        [$user,$house] = $this->household();
        $this->actingAs($user)->post('/loans', ['name' => 'Car', 'balance' => '1250', 'balance_date' => '2026-10-01', 'scheduled' => true, 'installment' => '500', 'frequency' => 'monthly', 'first_date' => '2026-10-25'])->assertRedirect();
        $loan = $this->inHouse($house, fn () => Loan::first());
        $this->inHouse($house, fn () => $this->assertSame([50000, 50000, 25000], Occurrence::orderBy('slot_order')->pluck('amount_cents')->map(fn ($v) => (int) $v)->all()));
        $o = $this->inHouse($house, fn () => Occurrence::orderBy('slot_order')->first());
        $this->post('/occurrences/'.$o->id.'/complete', ['lock_version' => $o->lock_version, 'completed_date' => '2026-10-03'])->assertRedirect();
        $this->inHouse($house, fn () => $this->assertSame(75000, (int) Account::find($loan->account_id)->balance_cents));
        $version = $this->inHouse($house, fn () => $o->fresh()->lock_version);
        $this->post('/occurrences/'.$o->id.'/reverse', ['lock_version' => $version])->assertRedirect();
        $this->inHouse($house, fn () => $this->assertSame(125000, (int) Account::find($loan->account_id)->balance_cents));
        $this->post('/loans/'.$loan->id.'/payments', ['amount' => '2000', 'payment_date' => '2026-10-03'])->assertSessionHasErrors('amount');
    }
}
