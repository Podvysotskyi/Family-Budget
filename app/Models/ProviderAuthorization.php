<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class ProviderAuthorization extends FinanceRecord
{
    use SoftDeletes;

    protected $table = 'provider_authorizations';

    protected $hidden = ['access_token', 'refresh_token'];

    protected function casts(): array
    {
        return [...parent::casts(), 'access_token' => 'encrypted', 'refresh_token' => 'encrypted'];
    }
}
