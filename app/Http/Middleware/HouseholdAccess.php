<?php

namespace App\Http\Middleware;

use App\Support\HouseholdContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class HouseholdAccess
{
    public function handle(Request $request, Closure $next)
    {
        $context = app(HouseholdContext::class);
        try {
            return DB::transaction(function () use ($request, $next, $context) {
                $member = DB::table('household_members')->where('user_id', $request->user()->id)->whereNull('deleted_at')->first();
                if (! $member) {
                    return $request->expectsJson() ? response()->json(['code' => 'household_access_revoked'], 403) : redirect('/setup');
                }
                $readOnly = $request->isMethod('GET') && ! $request->is('home', 'connections/*');
                $household = DB::table('households')->where('id', $member->household_id)->whereNull('deleted_at')->lock($readOnly ? 'FOR SHARE' : 'FOR UPDATE')->first();
                $member = DB::table('household_members')->where('id', $member->id)->whereNull('deleted_at')->first();
                if (! $household || ! $member) {
                    return $request->expectsJson() ? response()->json(['code' => 'household_access_revoked'], 403) : redirect('/setup');
                }
                $context->id = $household->id;
                $context->memberId = $member->id;
                $context->owner = $household->owner_member_id === $member->id;
                DB::select("select set_config('app.household_id', ?, true)", [$household->id]);
                $request->attributes->set('household', $household);
                $request->attributes->set('member', $member);
                $response = $next($request);
                $response->headers->set('Cache-Control', 'no-store, private');

                return $response;
            });
        } finally {
            $context->id = null;
            $context->memberId = null;
            $context->owner = false;
        }
    }
}
