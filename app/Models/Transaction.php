<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class Transaction extends FinanceRecord
{
    use SoftDeletes;

    protected $table = 'transactions';

    protected $attributes = ['lock_version' => 1, 'status' => 'posted', 'hidden' => false];
}
