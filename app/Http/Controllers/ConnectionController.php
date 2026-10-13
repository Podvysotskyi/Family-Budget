<?php

namespace App\Http\Controllers;

use App\Domain\Banking\AccountDiscovery;
use App\Domain\Banking\LunchFlow;
use App\Domain\Banking\Syncs;
use App\Domain\History\Audit;
use App\Models\Account;
use App\Models\Connection;
use App\Models\OutboxMessage;
use App\Models\ProviderAuthorization;
use App\Models\SyncAccountRun;
use App\Models\SyncRun;
use App\Support\HouseholdContext;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ConnectionController extends FinanceController
{
    public function authorizeProvider(Request $r): mixed
    {
        abort_unless(config('finance.lunchflow_enabled') && config('services.lunchflow.client_id'), 503, 'Bank connections are not configured.');
        $reconnect = $r->filled('reconnect') ? Connection::findOrFail($r->input('reconnect')) : null;
        $state = Str::random(64);
        $r->session()->put('bank_oauth', ['state' => $state, 'household' => app(HouseholdContext::class)->id, 'member' => app(HouseholdContext::class)->memberId, 'reconnect' => $reconnect?->id]);

        return Inertia::location('https://www.lunchflow.app/api/platform/oauth/authorize?'.http_build_query(['client_id' => config('services.lunchflow.client_id'), 'redirect_uri' => config('services.lunchflow.redirect'), 'email' => $r->user()->email, 'state' => $state]));
    }

    public function callback(Request $r, LunchFlow $provider, Syncs $syncs): mixed
    {
        $grant = $r->session()->pull('bank_oauth');
        abort_unless($grant && hash_equals($grant['state'], (string) $r->input('state')) && $grant['household'] === app(HouseholdContext::class)->id && $grant['member'] === app(HouseholdContext::class)->memberId, 403, 'Authorization session changed.');
        $r->validate(['code' => 'required|string|max:2048']);
        try {
            DB::transaction(function () use ($r, $provider, $syncs, $grant) {
                $tokens = $provider->token(['grant_type' => 'authorization_code', 'code' => $r->input('code'), 'redirect_uri' => config('services.lunchflow.redirect')]);
                if (empty($tokens['user_id'])) {
                    throw new \RuntimeException('Provider user identity is unavailable.');
                }
                $userKey = (string) $tokens['user_id'];
                $house = app(HouseholdContext::class)->id;
                $foreign = DB::table('provider_resource_bindings')->where('provider_user_key', $userKey)->where('resource_kind', 'authorization')->first();
                abort_if($foreign && $foreign->household_id !== $house, 422, 'This provider identity belongs to another household. Use a separate identity.');
                $authorization = ProviderAuthorization::firstOrCreate(['provider_user_key' => $userKey], ['authorizing_member_id' => app(HouseholdContext::class)->memberId, 'access_token' => $tokens['access_token'], 'refresh_token' => $tokens['refresh_token'], 'token_expires_at' => now()->addSeconds($tokens['expires_in'] ?? 3600)]);
                $authorization->update(['access_token' => $tokens['access_token'], 'refresh_token' => $tokens['refresh_token'], 'token_expires_at' => now()->addSeconds($tokens['expires_in'] ?? 3600), 'state' => 'active']);
                abort_unless(app(AccountDiscovery::class)->bind($userKey, 'authorization', $userKey), 422, 'This provider identity belongs to another household. Use a separate identity.');
                if (! empty($grant['reconnect'])) {
                    $connection = Connection::findOrFail($grant['reconnect']);
                    abort_unless($connection->authorization_id === $authorization->id, 422, 'Reconnect using the original provider identity.');
                    $before = $connection->toArray();
                    $connection->update(['state' => 'active', 'lifecycle_version' => $connection->lifecycle_version + 1]);
                    Audit::record($connection, 'reconnected', $before);
                }
                $data = $provider->get($tokens['access_token'], '/accounts');
                app(AccountDiscovery::class)->discover($authorization, $data['accounts'] ?? [], empty($grant['reconnect']));
                foreach (Connection::where('authorization_id', $authorization->id)->where('state', 'active')->get() as $connection) {
                    if (! Account::where('connection_id', $connection->id)->whereNull('import_start_date')->exists()) {
                        $syncs->request($connection, 'discovery');
                    }
                }
            });
        } catch (HttpResponseException|HttpException $error) {
            throw $error;
        } catch (\Throwable $error) {
            return redirect('/household')->with('error', 'Bank authorization could not be completed. Check the provider configuration and try again.');
        }

        return redirect('/household')->with('success', 'Bank authorization saved. Open connection details to confirm each new account’s import starting date.');
    }

    public function detail(Request $r, string $id): mixed
    {
        $connection = Connection::findOrFail($id);
        $runs = SyncRun::where('connection_id', $id)->latest()->paginate($this->pageSize($r))->withQueryString();
        $runs->getCollection()->transform(fn ($run) => [...$run->toArray(), 'accounts' => SyncAccountRun::where('sync_run_id', $run->id)->get()]);

        return response()->json(['connection' => $connection, 'accounts' => Account::where('connection_id', $id)->orderBy('name')->get(), 'runs' => $runs, 'default_start_date' => now($r->user()->timezone)->startOfMonth()->toDateString()]);
    }

    public function update(Request $r, string $id, Syncs $syncs): mixed
    {
        return $this->change($r, function () use ($r, $id, $syncs) {
            $connection = Connection::findOrFail($id);
            $this->version($r, $connection);
            $v = $r->validate(['name' => 'required|string|max:120', 'member_id' => 'nullable|uuid', 'accounts' => 'required|array', 'accounts.*.id' => 'required|uuid|distinct', 'accounts.*.import_start_date' => 'required|date_format:Y-m-d|before_or_equal:today']);
            $this->relations($v);
            foreach ($v['accounts'] as $row) {
                $account = Account::where('connection_id', $id)->findOrFail($row['id']);
                $before = $account->toArray();
                $account->update(['import_start_date' => $row['import_start_date'], 'lock_version' => $account->lock_version + 1]);
                Audit::record($account, 'import_start_changed', $before);
            }
            $before = $connection->toArray();
            $connection->update(['name' => $v['name'], 'member_id' => $v['member_id'] ?? null, 'lock_version' => $connection->lock_version + 1]);
            Audit::record($connection, 'edited', $before);
            if ($connection->state === 'active' && ! Account::where('connection_id', $id)->whereNull('import_start_date')->exists()) {
                $syncs->request($connection, 'configuration');
            }

            return $connection;
        }, 'Connection saved. Import date changes preserve existing history; the next sync imports eligible older data.');
    }

    public function sync(Request $r, string $id, Syncs $syncs): mixed
    {
        return $this->change($r, fn () => $syncs->request(Connection::findOrFail($id)), 'Sync requested. Existing active requests are reused.');
    }

    public function destroy(Request $r, string $id): mixed
    {
        return $this->change($r, function () use ($id) {
            $connection = Connection::findOrFail($id);
            $before = $connection->toArray();
            $connection->update(['state' => 'disconnected', 'lifecycle_version' => $connection->lifecycle_version + 1]);
            OutboxMessage::create(['kind' => 'disconnect', 'payload' => ['connection_id' => $connection->id]]);
            Audit::record($connection, 'disconnected', $before);

            return $connection;
        }, 'Connection disconnected. Imported history is retained.');
    }
}
