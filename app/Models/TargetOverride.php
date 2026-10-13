<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class TargetOverride extends FinanceRecord
{
    use SoftDeletes;

    protected $table = 'budget_target_overrides';
}
