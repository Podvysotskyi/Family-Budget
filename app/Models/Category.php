<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends FinanceRecord
{
    use SoftDeletes;

    protected $table = 'categories';
}
