<?php

namespace App\Domain\Households;

use App\Domain\History\Audit;
use App\Models\Category;
use App\Models\Household;
use App\Models\Invitation;
use App\Models\Member;
use App\Models\User;
use App\Support\HouseholdContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class Households
{
    public function create(User $user, string $name, string $nickname): Household
    {
        return DB::transaction(function () use ($user, $name, $nickname) {
            User::whereKey($user->id)->lockForUpdate()->first();
            if (Member::where('user_id', $user->id)->exists()) {
                throw ValidationException::withMessages(['name' => 'Leave your current household first.']);
            }
            $h = Household::create(['name' => $name]);
            $m = Member::create(['household_id' => $h->id, 'user_id' => $user->id, 'nickname' => $nickname]);
            $h->update(['owner_member_id' => $m->id]);
            app(HouseholdContext::class)->run($h->id, function () use ($h) {
                $this->seedCategories();
                Audit::record($h, 'created');
            });

            return $h;
        });
    }

    public function seedCategories(): void
    {
        $defaults = [
            'Housing' => ['Rent', 'Mortgage', 'Repairs', 'HOA fees'], 'Utilities' => ['Electric', 'Gas', 'Water', 'Trash'],
            'Phone & Internet' => ['Mobile', 'Internet'], 'Insurance' => ['Car', 'Home or renters', 'Health', 'Life'],
            'Transportation' => ['Fuel', 'Public transit', 'Rideshare', 'Parking', 'Car maintenance'], 'Groceries' => ['Supermarket', 'Farmers market'],
            'Dining' => ['Restaurants', 'Delivery', 'Coffee'], 'Healthcare' => ['Pharmacy', 'Doctor', 'Dental', 'Vision'],
            'Subscriptions' => ['Streaming', 'Music', 'Software', 'Fitness'], 'Loan Payments' => ['Car loan', 'Student loan', 'Personal loan'], 'Other Expenses' => [],
            'Salary' => ['Regular pay', 'Bonus'], 'Freelance Income' => [], 'Benefits' => [], 'Interest & Dividends' => ['Interest', 'Dividends'], 'Other Income' => [],
            'Transfers Between Accounts' => [],
        ];
        foreach ($defaults as $name => $children) {
            $kind = in_array($name, ['Salary', 'Freelance Income', 'Benefits', 'Interest & Dividends', 'Other Income']) ? 'income' : ($name === 'Transfers Between Accounts' ? 'transfer' : 'expense');
            $key = match ($name) {
                'Transfers Between Accounts' => 'transfers','Loan Payments' => 'loan_payments',default => null
            };
            $root = Category::create(['name' => $name, 'name_normalized' => mb_strtolower($name), 'kind' => $kind, 'system_key' => $key]);
            foreach ($children as $child) {
                Category::create(['name' => $child, 'name_normalized' => mb_strtolower($child), 'kind' => $kind, 'parent_id' => $root->id]);
            }
        }
    }

    public function accept(User $user, string $id): void
    {
        DB::transaction(function () use ($user, $id) {
            $invite = Invitation::whereKey($id)->where('target_email', mb_strtolower($user->email))->firstOrFail();
            $house = Household::whereKey($invite->household_id)->lockForUpdate()->firstOrFail();
            User::whereKey($user->id)->lockForUpdate()->first();
            $invite = Invitation::whereKey($id)->lockForUpdate()->firstOrFail();
            if (! $user->email_verified_at || $invite->status !== 'pending') {
                throw ValidationException::withMessages(['invitation' => 'This invitation is no longer available.']);
            }
            if (Member::where('user_id', $user->id)->exists()) {
                throw ValidationException::withMessages(['invitation' => 'Leave your current household before joining.']);
            }
            $member = $invite->target_member_id ? Member::where('household_id', $house->id)->whereKey($invite->target_member_id)->lockForUpdate()->firstOrFail() : new Member(['household_id' => $house->id, 'nickname' => $user->name]);
            if ($member->user_id) {
                throw ValidationException::withMessages(['invitation' => 'This member profile has already been linked.']);
            }
            $member->user_id = $user->id;
            $member->save();
            $invite->update(['status' => 'accepted', 'accepted_by_user_id' => $user->id]);
            Invitation::where('household_id', $house->id)->where('target_email', $invite->target_email)->where('status', 'pending')->update(['status' => 'canceled']);
            $house->increment('access_version');
            app(HouseholdContext::class)->run($house->id, fn () => Audit::record($member, 'joined'));
        });
    }
}
