<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        $user = $request->user();

        return [...parent::share($request),
            'auth' => $user ? ['name' => $user->name, 'email' => $user->email, 'timezone' => $user->timezone, 'id' => $user->id] : null,
            'household' => function () use ($request) {
                $house = $request->attributes->get('household');

                return $house ? ['id' => $house->id, 'name' => $house->name, 'owner_member_id' => $house->owner_member_id, 'access_version' => $house->access_version, 'data_version' => $house->data_version, 'member_count' => DB::table('household_members')->where('household_id', $house->id)->whereNull('deleted_at')->count(), 'owner' => $request->attributes->get('member')->id === $house->owner_member_id] : null;
            },
            'unread' => fn () => $user ? DB::table('notifications')->where('user_id', $user->id)->whereNull('read_at')->whereNull('dismissed_at')->count() : 0,
            'flash' => ['success' => fn () => $request->session()->get('success'), 'error' => fn () => $request->session()->get('error')],
            'today' => $user ? now($user->timezone)->toDateString() : now('UTC')->toDateString(),
            'utcMonth' => now('UTC')->format('Y-m'),
        ];
    }
}
