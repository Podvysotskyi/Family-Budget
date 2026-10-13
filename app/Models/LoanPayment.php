<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class LoanPayment extends FinanceRecord
{
    use SoftDeletes;

    protected $table = 'loan_payments';
}
