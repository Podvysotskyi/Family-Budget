<?php

namespace Tests\Feature;

use App\Domain\Loans\Loans;
use App\Domain\Scheduling\Schedules;
use App\Models\Account;
use App\Models\Loan;
use App\Models\LoanCheckpoint;
use App\Models\Occurrence;
use App\Models\Series;
use Tests\FinanceTestCase;

class FinancialWorkflowTest extends FinanceTestCase
{
    public function test_card_statement_requires_an_amount_and_disabling_preserves_paid_history(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(12, 0));
        [$user, $house] = $this->household();
        $card = $this->inHouse($house, fn () => Account::factory()->create(['type' => 'credit_card']));
        $this->actingAs($user)->post('/accounts/'.$card->id.'/schedules', ['lock_version' => 1, 'purpose' => 'statement', 'enabled' => true, 'first_date' => '2026-10-15'])->assertRedirect();
        $item = $this->inHouse($house, fn () => Occurrence::orderBy('slot_order')->first());
        $this->postJson('/occurrences/'.$item->id.'/complete', ['lock_version' => 1, 'completed_date' => '2026-10-03'])->assertUnprocessable()->assertJsonValidationErrors('amount');
        $this->patch('/occurrences/'.$item->id, ['lock_version' => 1, 'amount' => '125.00'])->assertRedirect();
        $this->post('/occurrences/'.$item->id.'/complete', ['lock_version' => 2, 'completed_date' => '2026-10-03'])->assertRedirect();
        $this->post('/accounts/'.$card->id.'/schedules', ['lock_version' => 2, 'purpose' => 'statement', 'enabled' => false])->assertRedirect();
        $this->inHouse($house, function () use ($item) {
            $this->assertSame('paid', $item->fresh()->status);
            $this->assertSame(0, Occurrence::where('series_id', $item->series_id)->where('status', 'unpaid')->count());
            $this->assertSoftDeleted('scheduled_series', ['id' => $item->series_id]);
        });
        $this->postJson('/accounts/'.$card->id.'/schedules', ['lock_version' => 3, 'purpose' => 'statement', 'enabled' => true, 'first_date' => '2026-10-15'])->assertUnprocessable()->assertJsonValidationErrors('first_date');
        $this->post('/accounts/'.$card->id.'/schedules', ['lock_version' => 3, 'purpose' => 'statement', 'enabled' => true, 'first_date' => '2026-11-15'])->assertRedirect();
        $this->delete('/accounts/'.$card->id, ['lock_version' => 4])->assertRedirect();
        $this->inHouse($house, function () use ($card, $item) {
            $this->assertSame(0, Series::where('generated_by_account_id', $card->id)->count());
            $this->assertSame('paid', $item->fresh()->status);
        });
    }

    public function test_loan_schedule_disable_and_reenable_keep_payments_and_balance_reconciled(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(12, 0));
        [$user, $house] = $this->household();
        $this->actingAs($user)->postJson('/loans', ['name' => 'Invalid cadence', 'balance' => '1250', 'balance_date' => '2026-10-01', 'scheduled' => true, 'installment' => '500', 'frequency' => 'twice_monthly', 'first_date' => '2026-10-25'])->assertUnprocessable()->assertJsonValidationErrors('day_two');
        $this->actingAs($user)->post('/loans', ['name' => 'Car', 'balance' => '1250', 'balance_date' => '2026-10-01', 'scheduled' => true, 'installment' => '500', 'frequency' => 'monthly', 'first_date' => '2026-10-25'])->assertRedirect();
        [$loan, $item] = $this->inHouse($house, fn () => [Loan::first(), Occurrence::orderBy('slot_order')->first()]);
        $accountVersion = $this->inHouse($house, fn () => Account::findOrFail($loan->account_id)->lock_version);
        $this->deleteJson('/accounts/'.$loan->account_id, ['lock_version' => $accountVersion])->assertUnprocessable();
        $this->post('/occurrences/'.$item->id.'/complete', ['lock_version' => $item->lock_version, 'completed_date' => '2026-10-03'])->assertRedirect();
        $version = $this->inHouse($house, fn () => $loan->fresh()->lock_version);
        $this->patch('/loans/'.$loan->id, ['lock_version' => $version, 'name' => 'Car', 'scheduled' => false])->assertRedirect();
        $this->inHouse($house, function () use ($loan, $item) {
            $this->assertNull($loan->fresh()->series_id);
            $this->assertSame(75000, (int) Account::find($loan->account_id)->balance_cents);
            $this->assertSame('paid', $item->fresh()->status);
            $this->assertSame(1, LoanCheckpoint::where('loan_id', $loan->id)->count());
        });
        $version = $this->inHouse($house, fn () => $loan->fresh()->lock_version);
        $this->patch('/loans/'.$loan->id, ['lock_version' => $version, 'name' => 'Car', 'scheduled' => true, 'balance' => '750', 'installment' => '300', 'frequency' => 'monthly', 'first_date' => '2026-11-25'])->assertRedirect();
        $this->inHouse($house, function () use ($loan, $item) {
            $current = $loan->fresh();
            $this->assertNotSame($item->series_id, $current->series_id);
            $this->assertSame(125000, (int) $current->repayment_total_cents);
            $this->assertSame(75000, (int) Account::find($loan->account_id)->balance_cents);
            $this->assertSame([30000, 30000, 15000], Occurrence::where('series_id', $current->series_id)->orderBy('slot_order')->pluck('amount_cents')->map(fn ($value) => (int) $value)->all());
        });
    }

    public function test_loan_recalculation_preserves_a_scoped_paying_account_change(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(12, 0));
        [$user, $house] = $this->household();
        [$first, $second] = $this->inHouse($house, fn () => [Account::factory()->create(), Account::factory()->create()]);
        $this->actingAs($user)->post('/loans', ['name' => 'Car', 'balance' => '1500', 'balance_date' => '2026-10-01', 'scheduled' => true, 'installment' => '500', 'frequency' => 'monthly', 'first_date' => '2026-10-25', 'account_ids' => [$first->id]])->assertRedirect();
        [$loan, $items] = $this->inHouse($house, fn () => [Loan::first(), Occurrence::orderBy('slot_order')->get()]);
        $this->patch('/loans/'.$loan->id, ['lock_version' => $loan->lock_version, 'name' => 'Car', 'account_ids' => [$second->id], 'anchor_id' => $items[1]->id, 'scope' => 'future'])->assertRedirect();
        $this->post('/loans/'.$loan->id.'/payments', ['amount' => '100', 'payment_date' => '2026-10-03'])->assertRedirect();
        $this->inHouse($house, function () use ($first, $second, $items, $loan) {
            $this->assertSame([$first->id], $items[0]->fresh()->account_ids);
            $this->assertSame([$second->id], $items[1]->fresh()->account_ids);
            $this->assertSame(40000, (int) $items[2]->fresh()->amount_cents);
            $version = $loan->fresh()->lock_version;
            app(Loans::class)->materialize($loan->fresh());
            $this->assertSame($version, $loan->fresh()->lock_version);
        });
    }

    public function test_cadence_edit_reserves_deleted_slots_and_future_generation_uses_the_new_rule(): void
    {
        [, $house] = $this->household();
        $this->inHouse($house, function () {
            $series = Series::factory()->create(['frequency' => 'monthly', 'first_date' => '2026-01-10']);
            $service = app(Schedules::class);
            $service->materialize($series, '2026-05-10');
            $items = Occurrence::orderBy('slot_order')->get();
            $service->remove($series, $items[2], 'occurrence');
            $service->edit($series->fresh(), $items[1], ['frequency' => 'weekly', 'first_date' => '2026-02-10'], 'future');
            $this->assertSame('2026-01-10', $items[0]->fresh()->due_date);
            $this->assertSame('2026-02-24', $items[3]->fresh()->due_date);
            $this->assertSame('2026-03-03', $items[4]->fresh()->due_date);
            $this->assertSoftDeleted('occurrences', ['id' => $items[2]->id]);
            $service->materialize($series->fresh(), '2026-06-01');
            $this->assertSame('2026-03-10', Occurrence::where('slot_order', 5)->firstOrFail()->due_date);
        });
    }

    public function test_subscription_cancellation_cannot_be_undone_by_reversing_a_paid_payment(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(12, 0));
        [$user, $house] = $this->household();
        [$series, $item] = $this->inHouse($house, function () {
            $series = Series::factory()->create(['kind' => 'subscription', 'first_date' => '2026-10-10']);
            app(Schedules::class)->materialize($series, '2026-12-31');

            return [$series, Occurrence::orderBy('slot_order')->first()];
        });
        $this->actingAs($user)->post('/occurrences/'.$item->id.'/complete', ['lock_version' => 1, 'completed_date' => '2026-10-03'])->assertRedirect();
        $this->post('/schedules/'.$series->id.'/cancel', ['lock_version' => 1, 'cancel_date' => '2026-10-10'])->assertRedirect();
        $this->post('/occurrences/'.$item->id.'/reverse', ['lock_version' => 2])->assertRedirect();
        $this->inHouse($house, function () use ($item, $series) {
            $this->assertSoftDeleted('occurrences', ['id' => $item->id]);
            app(Schedules::class)->materialize($series->fresh(), '2027-12-31');
            $this->assertSame(0, Occurrence::where('series_id', $series->id)->count());
        });
    }
}
