<?php

namespace Database\Factories;

use App\Models\Account;
use Illuminate\Database\Eloquent\Factories\Factory;

class AccountFactory extends Factory
{
    protected $model = Account::class;

    public function definition(): array
    {
        return ['name' => fake()->word().' checking', 'type' => 'checking', 'source' => 'manual', 'balance_cents' => 100000, 'balance_date' => '2026-10-01'];
    }
}
