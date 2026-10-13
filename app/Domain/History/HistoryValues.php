<?php

namespace App\Domain\History;

use App\Domain\Shared\Money;
use App\Models\Account;
use App\Models\AuditEvent;
use App\Models\Category;
use App\Models\Member;
use App\Models\Transaction;
use App\Support\HouseholdContext;

final class HistoryValues
{
    public function present(AuditEvent $event): array
    {
        $display = [];
        foreach ($event->changes ?? [] as $field => $change) {
            if ($field === 'id' || str_starts_with($field, 'provider_') || in_array($field, ['generation_key', 'rule_snapshot', 'payload', 'reminder_version', 'lifecycle_version', 'data_version', 'overrides'])) {
                continue;
            }
            $display[] = ['field' => ucwords(str_replace('_', ' ', str_replace('_cents', '', $field))), 'old' => $this->value($field, $change['old'] ?? null), 'new' => $this->value($field, $change['new'] ?? null)];
        }

        return [...$event->toArray(), 'display_changes' => $display];
    }

    private function value(string $field, mixed $value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }
        if (is_bool($value)) {
            return $value ? 'Yes' : 'No';
        }
        if (str_ends_with($field, '_cents') && is_numeric($value)) {
            return Money::display($value);
        }
        if (is_array($value)) {
            return $value ? implode(', ', array_map(fn ($entry) => $this->value(rtrim($field, 's'), $entry), $value)) : 'None';
        }
        if (in_array($field, ['member_id', 'recipient_id', 'actor_member_id'])) {
            return Member::withTrashed()->where('household_id', app(HouseholdContext::class)->id)->find($value)?->nickname ?? 'Former member';
        }
        if (in_array($field, ['account_id', 'usual_paying_account_id'])) {
            return Account::withTrashed()->find($value)?->name ?? 'Deleted account';
        }
        if (in_array($field, ['category_id', 'parent_id', 'replacement_id'])) {
            $category = Category::withTrashed()->find($value);
            $parent = $category?->parent_id ? Category::withTrashed()->find($category->parent_id) : null;

            return $category ? ($parent ? $parent->name.' › ' : '').$category->name : 'Deleted category';
        }
        if ($field === 'transaction_id') {
            $transaction = Transaction::withTrashed()->find($value);

            return ! $transaction || $transaction->trashed() ? 'A deleted transaction' : $transaction->payee;
        }
        if (str_ends_with($field, '_id')) {
            return 'Linked record';
        }

        return str_replace('_', ' ', (string) $value);
    }
}
