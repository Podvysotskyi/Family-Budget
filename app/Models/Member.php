<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Member extends Model
{
    use HasUuids,SoftDeletes;

    protected $table = 'household_members';

    protected $guarded = [];

    protected $attributes = ['lock_version' => 1];
}
