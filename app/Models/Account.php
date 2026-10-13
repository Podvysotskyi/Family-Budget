<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class Account extends FinanceRecord
{
    use SoftDeletes;

    protected $table = 'accounts';
}
