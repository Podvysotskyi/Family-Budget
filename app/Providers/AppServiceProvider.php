<?php

namespace App\Providers;

use App\Support\HouseholdContext;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->scoped(HouseholdContext::class, fn () => new HouseholdContext);
    }

    public function boot(): void
    {
        Inertia::encryptHistory();
    }
}
