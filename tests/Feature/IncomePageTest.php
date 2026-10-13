<?php

namespace Tests\Feature;

use App\Domain\Scheduling\Schedules;
use App\Models\Account;
use App\Models\Occurrence;
use App\Models\Series;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\FinanceTestCase;

class IncomePageTest extends FinanceTestCase
{
    public function test_income_page_requires_authentication_and_household_access(): void
    {
        $this->get('/income')->assertRedirect('/sign-in');
        $this->actingAs(User::factory()->create())->get('/income')->assertRedirect('/setup');
    }

    public function test_income_page_excludes_bills_subscriptions_and_other_households_even_with_a_kind_query(): void
    {
        [$user, $house] = $this->household();
        [, $foreignHouse] = $this->household();
        $this->inHouse($house, function (): void {
            Series::factory()->create(['kind' => 'bill', 'name' => 'Rent']);
            Series::factory()->create(['kind' => 'subscription', 'name' => 'Music']);
            Series::factory()->create(['kind' => 'income', 'name' => 'Salary']);
        });
        $this->inHouse($foreignHouse, fn () => Series::factory()->create(['kind' => 'income', 'name' => 'Private salary']));

        $this->actingAs($user)->get('/income?kind=bill')->assertInertia(fn (Assert $view) => $view
            ->where('section', 'income')->has('records.data', 1)->where('records.data.0.name', 'Salary')->where('records.data.0.kind', 'income'));
        $this->get('/bills?kind=all')->assertInertia(fn (Assert $view) => $view
            ->where('section', 'bills')->has('records.data', 1)->where('records.data.0.name', 'Rent'));
    }

    public function test_old_income_filter_links_redirect_with_search_assignment_and_pagination_preserved(): void
    {
        [$user, , $member] = $this->household();
        $filters = ['search' => 'Salary', 'assignment' => $member->id, 'per_page' => 10, 'page' => 2];

        $this->actingAs($user)->get('/bills?'.http_build_query(['kind' => 'income', ...$filters]))
            ->assertRedirect(route('income', $filters));
    }

    public function test_income_can_be_created_edited_and_received_on_its_own_page_and_stays_on_home(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 10)->setTime(12, 0));
        [$user, $house] = $this->household();
        $account = $this->inHouse($house, function (): Account {
            $bill = Series::factory()->create(['kind' => 'bill', 'frequency' => 'once', 'first_date' => '2026-10-10']);
            app(Schedules::class)->materialize($bill, '2026-10-10');

            return Account::factory()->create();
        });
        $values = ['name' => 'Salary', 'kind' => 'income', 'amount' => '200', 'frequency' => 'once', 'first_date' => '2026-10-10', 'account_ids' => [$account->id]];

        $this->actingAs($user)->from('/income')->post('/schedules', $values)->assertRedirect('/income')->assertSessionHasNoErrors();
        [$series, $occurrence] = $this->inHouse($house, function () use ($account): array {
            $series = Series::where('kind', 'income')->firstOrFail();
            $occurrence = Occurrence::where('series_id', $series->id)->firstOrFail();
            $this->assertSame([$account->id], $occurrence->account_ids);
            $this->assertSame('not_received', $occurrence->status);

            return [$series, $occurrence];
        });
        $this->patch('/schedules/'.$series->id, [...$values, 'name' => 'Updated salary', 'lock_version' => $series->lock_version, 'anchor_id' => $occurrence->id, 'scope' => 'future'])
            ->assertRedirect('/income')->assertSessionHasNoErrors();
        $version = $this->inHouse($house, fn () => $occurrence->fresh()->lock_version);
        $this->post('/occurrences/'.$occurrence->id.'/complete', ['lock_version' => $version, 'completed_date' => '2026-10-10'])
            ->assertRedirect('/income')->assertSessionHasNoErrors();
        $this->inHouse($house, function () use ($occurrence, $account): void {
            $this->assertSame('Updated salary', $occurrence->fresh()->name);
            $this->assertSame('received', $occurrence->fresh()->status);
            $this->assertSame(100000, (int) $account->fresh()->balance_cents);
        });
        $this->get('/income')->assertInertia(fn (Assert $view) => $view->has('records.data', 1)->where('records.data.0.name', 'Updated salary'));
        $this->get('/home?month=2026-10')->assertInertia(fn (Assert $view) => $view->has('records', 2)
            ->where('summary.income_cents', '20000')->where('summary.due_cents', '10000'));
    }
}
