<?php

namespace App\Domain\History;

use App\Models\AuditEvent;
use App\Support\HouseholdContext;

final class Audit
{
    public static function record($record, string $action, array $before = []): void
    {
        $after = $record->toArray();
        $changes = [];
        foreach (array_unique([...array_keys($before), ...array_keys($after)]) as $key) {
            if (in_array($key, ['updated_at', 'created_at', 'household_id', 'lock_version', 'access_token', 'refresh_token'])) {
                continue;
            }
            if (($before[$key] ?? null) !== ($after[$key] ?? null)) {
                $changes[$key] = ['old' => $before[$key] ?? null, 'new' => $after[$key] ?? null];
            }
        }
        AuditEvent::create(['subject_type' => $record->getTable(), 'subject_id' => $record->id, 'actor_user_id' => auth()->id(),
            'actor_member_id' => app(HouseholdContext::class)->memberId, 'actor_name' => auth()->user()?->name ?? 'System',
            'action' => $action, 'changes' => $changes]);
    }
}
