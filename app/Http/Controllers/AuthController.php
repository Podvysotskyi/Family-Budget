<?php

namespace App\Http\Controllers;

use App\Domain\Households\Households;
use App\Models\Household;
use App\Models\Invitation;
use App\Models\Member;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    public function signIn(): Response
    {
        return Inertia::render('Auth/SignIn', ['googleReady' => (bool) config('services.google.client_id')]);
    }

    public function google()
    {
        abort_unless(config('services.google.client_id'), 503, 'Google sign-in has not been configured.');

        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $r)
    {
        try {
            $g = Socialite::driver('google')->user();
        } catch (\Exception $e) {
            return redirect('/sign-in')->with('error', 'Sign-in did not finish. Please try again.');
        }
        if (! ($g->user['verified_email'] ?? $g->user['email_verified'] ?? false)) {
            return redirect('/sign-in')->with('error', 'A verified Google email is required.');
        }
        $user = User::firstOrNew(['google_subject' => $g->getId()]);
        if (User::where('email', mb_strtolower($g->getEmail()))->where('id', '!=', $user->id ?? 0)->exists()) {
            return redirect('/sign-in')->with('error', 'This email is associated with a different Google identity.');
        }
        $user->fill(['name' => $g->getName() ?? $g->getEmail(), 'email' => mb_strtolower($g->getEmail()), 'email_verified_at' => now(), 'password' => $user->password ?? bin2hex(random_bytes(32))]);
        $user->save();
        Auth::login($user);
        $r->session()->regenerate();
        Inertia::clearHistory();

        return redirect('/home');
    }

    public function logout(Request $r)
    {
        Auth::logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();
        Inertia::clearHistory();

        return redirect('/sign-in');
    }

    public function setup(Request $r)
    {
        if (Member::where('user_id', $r->user()->id)->exists()) {
            return redirect('/home');
        }
        $invites = Invitation::where('target_email', mb_strtolower($r->user()->email))->where('status', 'pending')->get()->map(function ($i) {
            $h = Household::find($i->household_id);

            return $h ? $this->invitationData($i) : null;
        })->filter()->values();

        $former = Member::onlyTrashed()->where('user_id', $r->user()->id)->latest('deleted_at')->first();

        return Inertia::render('Setup/Index', ['invitations' => $invites, 'formerMembershipEnded' => (bool) $former, 'formerHouseholdName' => $former ? Household::withTrashed()->find($former->household_id)?->name : null]);
    }

    public function create(Request $r, Households $service)
    {
        $v = $r->validate(['name' => 'required|string|max:100', 'nickname' => 'required|string|max:80', 'timezone' => 'required|timezone']);
        DB::transaction(function () use ($r, $service, $v) {
            $service->create($r->user(), $v['name'], $v['nickname']);
            $r->user()->update(['timezone' => $v['timezone']]);
        });
        Inertia::clearHistory();

        return redirect('/home');
    }

    public function createPage(Request $request): mixed
    {
        if (Member::where('user_id', $request->user()->id)->exists()) {
            return redirect()->route('home');
        }

        return Inertia::render('Setup/Create');
    }

    public function accept(Request $r, string $id, Households $service)
    {
        $v = $r->validate(['timezone' => 'nullable|timezone']);
        $firstMembership = ! Member::withTrashed()->where('user_id', $r->user()->id)->exists();
        $service->accept($r->user(), $id);
        if ($firstMembership && ! empty($v['timezone'])) {
            $r->user()->update(['timezone' => $v['timezone']]);
        }
        Inertia::clearHistory();

        return redirect('/home');
    }

    private function invitationData(Invitation $invitation): array
    {
        $house = Household::findOrFail($invitation->household_id);

        return ['id' => $invitation->id, 'household' => $house->name, 'created_at' => $invitation->created_at, 'inviter' => Member::withTrashed()->where('household_id', $house->id)->find($invitation->invited_by_member_id)?->nickname ?? 'Household owner', 'target_nickname' => $invitation->target_member_id ? Member::where('household_id', $house->id)->find($invitation->target_member_id)?->nickname : null, 'members' => Member::where('household_id', $house->id)->get()->map(fn ($m) => ['nickname' => $m->nickname, 'owner' => $m->id === $house->owner_member_id])];
    }

    public function invitation(Request $r, string $id): mixed
    {
        $invite = Invitation::where('target_email', mb_strtolower($r->user()->email))->where('status', 'pending')->findOrFail($id);

        return response()->json($this->invitationData($invite));
    }

    public function decline(Request $r, string $id)
    {
        Invitation::whereKey($id)->where('target_email', mb_strtolower($r->user()->email))->where('status', 'pending')->firstOrFail()->update(['status' => 'declined']);

        return back()->with('success', 'Invitation declined.');
    }
}
