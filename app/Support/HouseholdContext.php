<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

final class HouseholdContext
{
    public ?string $id = null;

    public ?string $memberId = null;

    public bool $owner = false;

    public function run(string $id, callable $callback): mixed
    {
        $previous = $this->id;
        try {
            return DB::transaction(function () use ($id, $callback, $previous) {
                $this->id = $id;
                DB::select("select set_config('app.household_id', ?, true)", [$id]);
                $result = $callback();
                DB::select("select set_config('app.household_id', ?, true)", [$previous ?? '']);

                return $result;
            });
        } finally {
            $this->id = $previous;
        }
    }
}
