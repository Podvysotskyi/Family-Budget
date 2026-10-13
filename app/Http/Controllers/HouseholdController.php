<?php

namespace App\Http\Controllers;

use App\Domain\History\Audit;
use App\Models\Connection;
use App\Models\Household;
use App\Models\Invitation;
use App\Models\Member;
use App\Models\OutboxMessage;
use App\Models\ReminderPlan;
use App\Models\SyncRun;
use App\Models\User;
use App\Support\HouseholdContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class HouseholdController extends FinanceController
{
    public function index()
    {
        $id = app(HouseholdContext::class)->id;

        return Inertia::render('Finance/Index', ['section' => 'household', 'records' => Member::where('household_id', $id)->get()->map(fn ($m) => [...$m->toArray(), 'email' => $m->user_id ? User::find($m->user_id)?->email : null]), 'invitations' => app(HouseholdContext::class)->owner ? Invitation::where('household_id', $id)->where('status', 'pending')->get() : [], 'connections' => Connection::get(), 'providerReady' => config('finance.lunchflow_enabled') && (bool) config('services.lunchflow.client_id'), 'catalog' => $this->catalog()]);
    }

    public function update(Request $r)
    {
        return $this->change($r, function () use ($r) {
            $v = $r->validate(['name' => 'required|string|max:100', 'lock_version' => 'required|integer|min:1']);
            $h = Household::findOrFail(app(HouseholdContext::class)->id);
            abort_unless((int) $v['lock_version'] === (int) $h->data_version, 409, 'This household changed. Reload before saving.');
            $before = $h->toArray();
            $h->update(['name' => $v['name'], 'data_version' => $h->data_version + 1]);
            Audit::record($h, 'edited', $before);

            return $h;
        }, 'Household updated.');
    }

    public function member(Request $r, ?string $id = null): mixed
    {
        return $this->change($r, function () use ($r, $id) {
            $house = app(HouseholdContext::class)->id;
            $v = $r->validate(['nickname' => 'required|string|max:80']);
            if ($id) {
                $m = Member::where('household_id', $house)->findOrFail($id);
                $this->version($r, $m);
                $before = $m->toArray();
                $m->update([...$v, 'lock_version' => $m->lock_version + 1]);
                Audit::record($m, 'edited', $before);
            } else {
                $this->owner();
                $invitation = $r->validate(['email' => 'nullable|email|max:200']);
                $m = Member::create([...$v, 'household_id' => $house]);
                Audit::record($m, 'created');
                if (! empty($invitation['email'])) {
                    $this->createInvitation($invitation['email'], $m->id);
                }
            }

            return $m;
        });
    }

    public function remove(Request $r, string $id)
    {
        return $this->change($r, function () use ($id) {
            $this->owner();
            $house = Household::findOrFail(app(HouseholdContext::class)->id);
            abort_if($house->owner_member_id === $id, 422, 'Transfer ownership before leaving.');
            $m = Member::where('household_id', $house->id)->findOrFail($id);
            $before = $m->toArray();
            $m->update(['left_at' => now()]);
            $m->delete();
            ReminderPlan::where('recipient_member_id', $id)->where('state', 'scheduled')->update(['state' => 'canceled']);
            $house->increment('access_version');
            Audit::record($m, 'removed', $before);

            return $m;
        }, 'Member removed. Household records are preserved.');
    }

    public function invite(Request $r)
    {
        return $this->change($r, function () use ($r) {
            $this->owner();
            $v = $r->validate(['email' => 'required|email|max:200', 'target_member_id' => 'nullable|uuid']);
            if (! empty($v['target_member_id'])) {
                Member::where('household_id', app(HouseholdContext::class)->id)->whereNull('user_id')->findOrFail($v['target_member_id']);
            }

            return $this->createInvitation($v['email'], $v['target_member_id'] ?? null);
        }, 'Invitation created. It will appear when that Google user signs in.');
    }

    private function createInvitation(string $email, ?string $targetMemberId): Invitation
    {
        $context = app(HouseholdContext::class);
        $invitation = Invitation::create(['household_id' => $context->id, 'target_email' => mb_strtolower(trim($email)), 'target_member_id' => $targetMemberId, 'invited_by_member_id' => $context->memberId]);
        $invitee = User::where('email', $invitation->target_email)->first();
        if ($invitee) {
            DB::table('notifications')->insertOrIgnore(['id' => (string) Str::uuid(), 'user_id' => $invitee->id, 'household_id' => $invitation->household_id, 'kind' => 'invitation', 'deduplication_key' => 'invitation:'.$invitation->id, 'data' => json_encode(['title' => 'You have a household invitation', 'invitation_id' => $invitation->id, 'destination' => '/profile']), 'created_at' => now(), 'updated_at' => now()]);
        }
        Audit::record($invitation, 'invited');

        return $invitation;
    }

    public function cancelInvite(Request $r, string $id)
    {
        return $this->change($r, function () use ($id) {
            $this->owner();
            $i = Invitation::where('household_id', app(HouseholdContext::class)->id)->where('status', 'pending')->findOrFail($id);
            $before = $i->toArray();
            $i->update(['status' => 'canceled']);
            Audit::record($i, 'canceled', $before);

            return $i;
        });
    }

    public function transfer(Request $r)
    {
        return $this->change($r, function () use ($r) {
            $this->owner();
            $v = $r->validate(['member_id' => 'required|uuid']);
            $ctx = app(HouseholdContext::class);
            $m = Member::where('household_id', $ctx->id)->whereNotNull('user_id')->findOrFail($v['member_id']);
            abort_if($m->id === $ctx->memberId, 422, 'Select another linked member.');
            $h = Household::findOrFail($ctx->id);
            $before = $h->toArray();
            $h->update(['owner_member_id' => $m->id, 'access_version' => $h->access_version + 1]);
            Audit::record($h, 'ownership_transferred', $before);

            return $h;
        }, 'Ownership transferred immediately.');
    }

    public function leave(Request $r)
    {
        $ctx = app(HouseholdContext::class);
        abort_if($ctx->owner, 422, 'Transfer ownership or delete the household first.');
        $m = Member::where('household_id', $ctx->id)->findOrFail($ctx->memberId);
        $before = $m->toArray();
        $m->delete();
        ReminderPlan::where('recipient_member_id', $m->id)->where('state', 'scheduled')->update(['state' => 'canceled']);
        Household::findOrFail($ctx->id)->increment('access_version');
        Audit::record($m, 'left', $before);
        Inertia::clearHistory();

        return redirect('/setup');
    }

    public function destroy(Request $r)
    {
        $this->owner();
        $ctx = app(HouseholdContext::class);
        $h = Household::findOrFail($ctx->id);
        $v = $r->validate(['name' => 'required|string']);
        if ($v['name'] !== $h->name) {
            throw ValidationException::withMessages(['name' => 'Type the household name to confirm.']);
        }$before = $h->toArray();
        $h->delete();
        Member::where('household_id', $h->id)->delete();
        Invitation::where('household_id', $h->id)->where('status', 'pending')->update(['status' => 'canceled']);
        ReminderPlan::where('state', 'scheduled')->update(['state' => 'canceled']);
        SyncRun::whereIn('state', ['queued', 'running'])->update(['state' => 'interrupted', 'finished_at' => now(), 'error' => 'household_deleted']);
        foreach (Connection::all() as $c) {
            $c->update(['state' => 'disconnected', 'lifecycle_version' => $c->lifecycle_version + 1]);
            OutboxMessage::create(['kind' => 'disconnect', 'payload' => ['connection_id' => $c->id]]);
        }Audit::record($h, 'deleted', $before);
        Inertia::clearHistory();

        return redirect('/setup');
    }
}
