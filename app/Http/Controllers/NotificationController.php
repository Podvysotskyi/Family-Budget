<?php

namespace App\Http\Controllers;

use App\Models\Invitation;
use App\Models\Occurrence;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $r): Response
    {
        $r->validate(['per_page' => 'nullable|integer|in:10,25,50', 'filter' => 'nullable|in:all,unread,dismissed']);
        $q = DB::table('notifications')->where('user_id', $r->user()->id)->orderByDesc('created_at');
        if ($r->input('filter') === 'unread') {
            $q->whereNull('read_at')->whereNull('dismissed_at');
        } elseif ($r->input('filter') === 'dismissed') {
            $q->whereNotNull('dismissed_at');
        } else {
            $q->whereNull('dismissed_at');
        }
        $records = $q->paginate($r->integer('per_page', 25))->withQueryString();
        $house = $r->attributes->get('household')->id;
        $records->getCollection()->transform(function ($n) use ($house, $r) {
            $data = json_decode($n->data, true);
            if ($n->kind === 'invitation') {
                $pending = Invitation::where('id', $data['invitation_id'] ?? null)->where('target_email', mb_strtolower($r->user()->email))->where('status', 'pending')->exists();
                $data = ['title' => $pending ? 'You have a household invitation' : 'A household invitation is no longer available', 'destination' => $pending ? '/profile' : null];
            } elseif ($n->household_id !== $house) {
                $data = ['title' => 'Household access ended', 'destination' => null];
            } elseif (isset($data['occurrence_id']) && ! Occurrence::find($data['occurrence_id'])) {
                $data = ['title' => 'A payment reminder is no longer available', 'destination' => null];
            } elseif (isset($data['occurrence_id'])) {
                $data['current_status'] = Occurrence::find($data['occurrence_id'])->status;
            }
            $n->data = $data;

            return $n;
        });

        return Inertia::render('Finance/Index', ['section' => 'notifications', 'records' => $records]);
    }

    public function read(Request $r, string $id): mixed
    {
        $this->query($r, $id)->update(['read_at' => $r->boolean('unread') ? null : now()]);

        return back();
    }

    public function dismiss(Request $r, string $id): mixed
    {
        $this->query($r, $id)->update(['dismissed_at' => now()]);

        return back();
    }

    public function allRead(Request $r): mixed
    {
        DB::table('notifications')->where('user_id', $r->user()->id)->whereNull('read_at')->update(['read_at' => now()]);

        return back();
    }

    private function query(Request $r, string $id): Builder
    {
        $query = DB::table('notifications')->where('user_id', $r->user()->id)->where('id', $id);
        abort_unless($query->exists(), 404);

        return $query;
    }
}
