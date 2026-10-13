<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class Occurrence extends FinanceRecord
{
    use SoftDeletes;

    protected $table = 'occurrences';

    protected $attributes = ['lock_version' => 1, 'status' => 'unpaid', 'reminder_version' => 1];
}
