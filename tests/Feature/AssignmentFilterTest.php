<?php

namespace Tests\Feature;

use App\Domain\Scheduling\Schedules;
use App\Models\Account;
use App\Models\Loan;
use App\Models\Member;
use App\Models\Occurrence;
use App\Models\Series;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\FinanceTestCase;

class AssignmentFilterTest extends FinanceTestCase
{
    #[TestWith(['bills', 'bill'])]
    #[TestWith(['income', 'income'])]
    #[TestWith(['subscriptions', 'subscription'])]
    public function test_filters_assignments_before_pagination_and_preserves_other_filters(string $page, string $kind): void
    {
        $this->travelTo(now()->setDate(2026, 10, 10)->setTime(12, 0));
        [$user, $house, $member] = $this->household();
        $this->inHouse($house, function () use ($kind, $member): void {
            Series::factory()->count(11)->create(['kind' => $kind, 'name' => 'Member payment', 'member_id' => $member->id]);
            Series::factory()->create(['kind' => $kind, 'name' => 'Household payment']);
            Series::factory()->create(['kind' => $kind, 'name' => 'Canceled payment', 'member_id' => $member->id, 'cancel_date' => '2026-10-09']);
        });

        $response = $this->actingAs($user)->get('/'.$page.'?assignment='.$member->id.'&search=Member&per_page=10');

        $response->assertInertia(fn (Assert $view) => $view->has('records.data', 10)
            ->where('records.total', 11)->where('records.data.0.member_id', $member->id)
            ->where('filters.assignment', $member->id)->where('filters.search', 'Member')
            ->where('records.next_page_url', fn (string $url): bool => str_contains($url, 'assignment='.$member->id) && str_contains($url, 'search=Member')));
        $this->get('/'.$page.'?assignment=household')->assertInertia(fn (Assert $view) => $view
            ->has('records.data', 1)->where('records.data.0.name', 'Household payment')->where('records.data.0.member_id', null));
        $this->get('/'.$page.'?assignment=')->assertInertia(fn (Assert $view) => $view->has('records.data', $kind === 'subscription' ? 12 : 13));
    }

    #[TestWith(['bills', 'bill', 'bill'])]
    #[TestWith(['income', 'income', 'income'])]
    #[TestWith(['subscriptions', 'subscription', 'all'])]
    public function test_filters_using_the_displayed_next_payment_or_latest_completed_payment(string $page, string $kind, string $kindFilter): void
    {
        $this->travelTo(now()->setDate(2026, 10, 10)->setTime(12, 0));
        [$user, $house, $member] = $this->household();
        $series = $this->inHouse($house, function () use ($kind, $member): Series {
            $series = Series::factory()->create(['kind' => $kind, 'member_id' => $member->id]);
            app(Schedules::class)->materialize($series, '2026-11-01');
            Occurrence::where('series_id', $series->id)->orderBy('due_date')->firstOrFail()->update(['member_id' => null]);

            return $series;
        });

        $response = $this->actingAs($user)->get('/'.$page.'?assignment=household&kind='.$kindFilter);

        $response->assertInertia(fn (Assert $view) => $view->has('records.data', 1)
            ->where('records.data.0.id', $series->id)->where('records.data.0.member_id', null));
        $this->get('/'.$page.'?assignment='.$member->id)->assertInertia(fn (Assert $view) => $view->has('records.data', 0));
        $this->inHouse($house, fn () => Occurrence::where('series_id', $series->id)->update(['status' => $kind === 'income' ? 'received' : 'paid']));
        $this->get('/'.$page.'?assignment='.$member->id)->assertInertia(fn (Assert $view) => $view->has('records.data', 1)->where('records.data.0.member_id', $member->id));
        $this->get('/'.$page.'?assignment=household')->assertInertia(fn (Assert $view) => $view->has('records.data', 0));
        $this->inHouse($house, fn () => Occurrence::where('series_id', $series->id)->latest('due_date')->firstOrFail()->delete());
        $this->get('/'.$page.'?assignment=household')->assertInertia(fn (Assert $view) => $view->has('records.data', 1)->where('records.data.0.member_id', null));
    }

    public function test_subscription_assignment_summary_includes_all_matching_pages_and_excludes_canceled_subscriptions(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 10)->setTime(12, 0));
        [$user, $house, $member] = $this->household();
        $this->inHouse($house, function () use ($member): void {
            Series::factory()->count(11)->create(['kind' => 'subscription', 'amount_cents' => 1000, 'member_id' => $member->id]);
            Series::factory()->create(['kind' => 'subscription', 'amount_cents' => 2000]);
            Series::factory()->create(['kind' => 'subscription', 'amount_cents' => 5000, 'member_id' => $member->id, 'cancel_date' => '2026-10-09']);
        });

        $response = $this->actingAs($user)->get('/subscriptions?assignment='.$member->id.'&per_page=10');

        $response->assertInertia(fn (Assert $view) => $view->has('records.data', 10)->where('records.total', 11)
            ->where('summary.active_count', 11)->where('summary.monthly_estimate_cents', '11000'));
        $this->get('/subscriptions?assignment='.$member->id.'&show_canceled=1')->assertInertia(fn (Assert $view) => $view
            ->has('records.data', 12)->where('summary.active_count', 11)->where('summary.monthly_estimate_cents', '11000'));
        $this->get('/subscriptions?assignment=household')->assertInertia(fn (Assert $view) => $view
            ->where('summary.active_count', 1)->where('summary.monthly_estimate_cents', '2000'));
    }

    public function test_home_assignment_filters_calendar_and_monthly_and_weekly_totals(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 10)->setTime(12, 0));
        [$user, $house, $member] = $this->household();
        $this->inHouse($house, function () use ($member): void {
            foreach ([['bill', 700, 'unpaid'], ['subscription', 300, 'paid'], ['income', 2000, 'not_received'], ['loan_installment', null, 'unpaid']] as [$kind, $amount, $status]) {
                $series = Series::factory()->create(['kind' => $kind, 'amount_cents' => $amount, 'frequency' => 'once', 'first_date' => '2026-10-07', 'member_id' => $member->id]);
                app(Schedules::class)->materialize($series, '2026-10-07');
                Occurrence::where('series_id', $series->id)->update(['status' => $status]);
            }
            Series::factory()->create(['name' => 'Household bill', 'amount_cents' => 9000, 'frequency' => 'once', 'first_date' => '2026-10-07']);
        });

        $response = $this->actingAs($user)->get('/home?month=2026-10&assignment='.$member->id);

        $response->assertInertia(fn (Assert $view) => $view->has('records', 4)->where('month', '2026-10')->where('filters.assignment', $member->id)
            ->where('summary.income_cents', '2000')->where('summary.due_cents', '1000')->where('summary.paid_cents', '300')
            ->where('summary.unpaid_cents', '700')->where('summary.unknown_count', 1)
            ->where('weeks.1.due_cents', '1000')->where('weeks.1.paid_cents', '300')->where('weeks.1.unknown_count', 1));
        $this->get('/home?month=2026-10&assignment=household')->assertInertia(fn (Assert $view) => $view
            ->has('records', 1)->where('records.0.name', 'Household bill')->where('summary.due_cents', '9000'));
        $this->get('/home?month=2026-10')->assertInertia(fn (Assert $view) => $view->has('records', 5)->where('summary.due_cents', '10000'));
    }

    public function test_loans_filter_account_assignment_for_balance_tracking_and_scheduled_and_paid_off_loans(): void
    {
        [$user, $house, $member] = $this->household();
        $loans = $this->inHouse($house, function () use ($member): array {
            $personalAccount = Account::factory()->create(['type' => 'loan', 'member_id' => $member->id]);
            $personal = Loan::create(['account_id' => $personalAccount->id]);
            $scheduledAccount = Account::factory()->create(['type' => 'loan', 'member_id' => $member->id]);
            $series = Series::factory()->create(['kind' => 'loan_installment', 'member_id' => $member->id]);
            Loan::create(['account_id' => $scheduledAccount->id, 'series_id' => $series->id]);
            $shared = Loan::create(['account_id' => Account::factory()->create(['type' => 'loan'])->id]);
            Loan::create(['account_id' => Account::factory()->create(['type' => 'loan', 'member_id' => $member->id, 'balance_cents' => 0])->id]);

            return [$personal, $shared];
        });

        $response = $this->actingAs($user)->get('/loans?assignment='.$member->id);

        $response->assertInertia(fn (Assert $view) => $view->has('records.data', 2)->where('filters.assignment', $member->id));
        $this->get('/loans?assignment='.$member->id.'&show_paid=1')->assertInertia(fn (Assert $view) => $view->has('records.data', 3));
        $this->get('/loans?assignment=household')->assertInertia(fn (Assert $view) => $view->has('records.data', 1)->where('records.data.0.id', $loans[1]->id));
        $this->get('/loans?assignment='.$member->id.'&loan='.$loans[0]->id)->assertInertia(fn (Assert $view) => $view->has('records.data', 2));
        $this->get('/loans?assignment=household&loan='.$loans[0]->id)->assertNotFound();
    }

    #[TestWith(['bills'])]
    #[TestWith(['income'])]
    #[TestWith(['subscriptions'])]
    #[TestWith(['loans'])]
    #[TestWith(['home'])]
    public function test_assignment_accepts_members_without_logins_and_rejects_foreign_deleted_or_invalid_members(string $page): void
    {
        [$user, $house] = $this->household();
        $member = Member::create(['household_id' => $house->id, 'nickname' => 'Jamie']);
        [, , $foreign] = $this->household();

        $response = $this->actingAs($user)->get('/'.$page.'?assignment='.$member->id);

        $response->assertInertia(fn (Assert $view) => $view->where('filters.assignment', $member->id)
            ->where('catalog.members', fn ($members): bool => collect($members)->contains('id', $member->id) && ! collect($members)->contains('id', $foreign->id)));
        $this->get('/'.$page.'?assignment='.$foreign->id)->assertNotFound();
        $member->delete();
        $this->get('/'.$page.'?assignment='.$member->id)->assertNotFound();
        $this->getJson('/'.$page.'?assignment=invalid')->assertUnprocessable()->assertJsonValidationErrors('assignment');
        $this->getJson('/'.$page.'?assignment[]=household')->assertUnprocessable()->assertJsonValidationErrors('assignment');
    }
}
