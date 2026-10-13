<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class TargetPeriod extends FinanceRecord
{
    use SoftDeletes;

    protected $table = 'budget_target_periods';
}
