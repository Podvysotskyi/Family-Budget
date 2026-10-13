<?php

namespace App\Http\Controllers;

use App\Domain\Notifications\Reminders;
use App\Models\Household;
use App\Models\Invitation;
use App\Support\HouseholdContext;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function index(Request $r)
    {
        return Inertia::render('Finance/Index', ['section' => 'profile', 'records' => [], 'profile' => $r->user()->only(['name', 'email', 'timezone', 'reminder_local_time']), 'invitations' => Invitation::where('target_email', mb_strtolower($r->user()->email))->where('status', 'pending')->get()->map(fn ($i) => [...$i->toArray(), 'household' => Household::find($i->household_id)?->name])]);
    }

    public function update(Request $r)
    {
        $v = $r->validate(['timezone' => 'required|timezone', 'reminder_local_time' => 'required|date_format:H:i']);
        $r->user()->update([...$v, 'reminder_settings_version' => $r->user()->reminder_settings_version + 1]);
        app(Reminders::class)->plan(true);

        return back()->with('success', 'Profile saved.');
    }

    public function context(Request $r)
    {
        return response()->json(['household_id' => $r->attributes->get('household')->id, 'access_version' => $r->attributes->get('household')->access_version, 'data_version' => $r->attributes->get('household')->data_version, 'owner' => app(HouseholdContext::class)->owner]);
    }
}
