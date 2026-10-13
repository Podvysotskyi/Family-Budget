<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Category;
use App\Models\Household;
use App\Models\Series;
use App\Models\Transaction;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\FinanceTestCase;

class AuthenticationTest extends FinanceTestCase
{
    public function test_sign_in_only_offers_configured_google_authentication(): void
    {
        config(['services.google.client_id' => 'configured-client']);

        $this->get('/sign-in')->assertOk()->assertInertia(fn (Assert $view) => $view
            ->component('Auth/SignIn')
            ->where('googleReady', true)
            ->missing('demo'));
        $this->assertGuest();
    }

    public function test_demo_sign_in_is_unavailable_even_with_legacy_demo_configuration(): void
    {
        config(['app.env' => 'local', 'finance.demo' => true]);
        User::factory()->create(['email' => 'alex@household.local', 'google_subject' => 'local-demo-owner']);

        $this->post('/auth/demo', ['role' => 'owner'])->assertNotFound();
        $this->assertGuest();
    }

    public function test_default_seeding_does_not_create_demo_users_or_households(): void
    {
        config(['app.env' => 'local', 'finance.demo' => true]);

        $this->artisan('db:seed', ['--no-interaction' => true])->assertSuccessful();

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('households', 0);
    }

    public function test_new_households_start_with_required_categories_and_empty_financial_records(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/setup/household', [
            'name' => 'Our household',
            'nickname' => 'Owner',
            'timezone' => 'America/Chicago',
        ])->assertRedirect('/home')->assertSessionHasNoErrors();

        $this->inHouse(Household::firstOrFail(), function () {
            $this->assertTrue(Category::where('system_key', 'transfers')->exists());
            $this->assertTrue(Category::where('system_key', 'loan_payments')->exists());
            $this->assertTrue(Category::whereNotNull('parent_id')->exists());
            $this->assertSame(0, Account::count());
            $this->assertSame(0, Transaction::count());
            $this->assertSame(0, Series::count());
        });
    }
}
