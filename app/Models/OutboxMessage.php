<?php

namespace App\Models;

class OutboxMessage extends FinanceRecord
{
    protected $table = 'outbox_messages';
}
