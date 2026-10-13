<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class Connection extends FinanceRecord
{
    use SoftDeletes;

    protected $table = 'connections';

    protected $attributes = ['lock_version' => 1, 'state' => 'active', 'lifecycle_version' => 1];
}
