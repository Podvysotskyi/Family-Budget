<?php

namespace App\Http\Controllers;

use App\Domain\Budget\Budget;
use App\Domain\Notifications\Reminders;
use App\Models\Account;
use App\Models\Category;
use App\Models\CommandReceipt;
use App\Models\Member;
use App\Support\HouseholdContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

abstract class FinanceController extends Controller
{
    protected function change(Request $r, callable $action, string $message = 'Saved.'): mixed
    {
        $r->validate(['command_key' => 'nullable|uuid']);
        $key = $r->input('command_key', Str::uuid()->toString());
        $payload = $r->except(['_token', 'command_key']);
        ksort($payload);
        $hash = hash('sha256', $r->method().'|'.$r->path().'|'.json_encode($payload));
        $receipt = CommandReceipt::where('user_id', $r->user()->id)->where('command_key', $key)->first();
        if ($receipt) {
            abort_unless(hash_equals($receipt->payload_hash, $hash), 409, 'Command key was already used with different data.');

            return back()->with('success', $message);
        }
        $result = $action();
        CommandReceipt::create(['user_id' => $r->user()->id, 'command_key' => $key, 'payload_hash' => $hash, 'result_id' => is_object($result) ? $result->id : null]);
        app(Budget::class)->evaluate();
        app(Reminders::class)->plan();

        return back()->with('success', $message);
    }

    protected function version(Request $r, $record): void
    {
        $r->validate(['lock_version' => 'required|integer|min:1']);
        abort_unless((int) $r->input('lock_version') === (int) $record->lock_version, 409, 'This record changed. Reload it before saving.');
    }

    protected function owner(): void
    {
        abort_unless(app(HouseholdContext::class)->owner, 403);
    }

    protected function relations(array $v): void
    {
        if (! empty($v['category_id'])) {
            Category::findOrFail($v['category_id']);
        }
        if (! empty($v['member_id'])) {
            Member::where('household_id', app(HouseholdContext::class)->id)->findOrFail($v['member_id']);
        }
        foreach ($v['account_ids'] ?? [] as $id) {
            Account::findOrFail($id);
        }
        foreach ($v['recipient_ids'] ?? [] as $id) {
            $member = Member::where('household_id', app(HouseholdContext::class)->id)->whereNotNull('user_id')->findOrFail($id);
        }
    }

    protected function catalog(): array
    {
        return ['accounts' => Account::orderBy('name')->get(), 'categories' => Category::orderBy('name')->get(),
            'members' => Member::where('household_id', app(HouseholdContext::class)->id)->orderBy('nickname')->get()];
    }

    protected function pageSize(Request $r): int
    {
        return in_array((int) $r->input('per_page'), [10, 25, 50]) ? (int) $r->input('per_page') : 25;
    }

    protected function assignment(Request $request): ?string
    {
        $assignment = $request->validate(['assignment' => 'nullable|string|max:36'])['assignment'] ?? null;
        if ($assignment !== null && $assignment !== 'household') {
            $request->validate(['assignment' => 'uuid']);
            Member::where('household_id', app(HouseholdContext::class)->id)->findOrFail($assignment);
        }

        return $assignment;
    }

    protected function filterAssignment(Builder $query, ?string $assignment, string|Builder $column = 'member_id'): Builder
    {
        if ($assignment !== null) {
            $query->where($column, '=', $assignment === 'household' ? null : $assignment);
        }

        return $query;
    }
}
