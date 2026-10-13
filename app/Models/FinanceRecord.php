<?php

namespace App\Models;

use App\Support\HouseholdContext;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

abstract class FinanceRecord extends Model
{
    use HasUuids, \Illuminate\Database\Eloquent\Factories\HasFactory;

    protected $guarded = [];

    protected $attributes = ['lock_version' => 1];

    protected function casts(): array
    {
        return ['account_ids' => 'array', 'recipient_ids' => 'array', 'overrides' => 'array', 'changes' => 'array', 'rule_snapshot' => 'array', 'data' => 'array', 'payload' => 'array', 'included_payment_ids' => 'array', 'hidden' => 'boolean', 'active_claim' => 'boolean', 'complete' => 'boolean'];
    }

    protected static function booted(): void
    {
        static::addGlobalScope('household', function ($q) {
            $id = app(HouseholdContext::class)->id;
            $id ? $q->where($q->getModel()->getTable().'.household_id', $id) : $q->whereRaw('1=0');
        });
        static::creating(function ($model) {
            $id = app(HouseholdContext::class)->id;
            if (! $id) {
                throw new \LogicException('Household context is required.');
            } $model->household_id = $id;
        });
    }

    public function toArray(): array
    {
        $data = parent::toArray();
        foreach ($data as $key => $value) {
            if (str_ends_with($key, '_cents') && $value !== null) {
                $data[$key] = (string) $value;
            }
        }

        return $data;
    }
}
