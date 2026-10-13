<?php

namespace Tests;

use App\Domain\Households\Households;
use App\Models\Household;
use App\Models\Member;
use App\Models\User;
use App\Support\HouseholdContext;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

abstract class FinanceTestCase extends TestCase
{
    use LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    protected function household(): array
    {
        $user = User::factory()->create();
        $house = app(Households::class)->create($user, 'Test household', 'Owner');
        $member = Member::where('household_id', $house->id)->where('user_id', $user->id)->firstOrFail();

        return [$user, $house, $member];
    }

    protected function inHouse(Household $house, callable $callback): mixed
    {
        return app(HouseholdContext::class)->run($house->id, $callback);
    }
}
