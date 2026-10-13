<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Loan extends FinanceRecord
{
    use SoftDeletes;

    protected $table = 'loans';

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
