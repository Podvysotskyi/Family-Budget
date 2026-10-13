<?php

namespace Database\Factories;

use App\Models\Series;
use Illuminate\Database\Eloquent\Factories\Factory;

class SeriesFactory extends Factory
{
    protected $model = Series::class;

    public function definition(): array
    {
        return ['name' => fake()->word(), 'kind' => 'bill', 'amount_cents' => 10000, 'frequency' => 'monthly', 'first_date' => '2026-10-01', 'account_ids' => [], 'recipient_ids' => []];
    }
}
