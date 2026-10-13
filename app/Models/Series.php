<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class Series extends FinanceRecord
{
    use SoftDeletes;

    protected $table = 'scheduled_series';
}
