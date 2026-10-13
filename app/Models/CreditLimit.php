<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class CreditLimit extends FinanceRecord
{
    use SoftDeletes;

    protected $table = 'credit_limit_entries';
}
