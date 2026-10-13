<?php

namespace App\Domain\Banking;

use App\Models\ProviderAuthorization;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class LunchFlow
{
    public function token(array $grant): array
    {
        $response = Http::acceptJson()->connectTimeout(5)->timeout(20)->post('https://www.lunchflow.app/api/platform/oauth/token', [
            ...$grant, 'client_id' => config('services.lunchflow.client_id'), 'client_secret' => config('services.lunchflow.client_secret'),
        ]);
        if (! $response->successful()) {
            throw new RuntimeException('Provider authorization failed (HTTP '.$response->status().').');
        }
        $data = $response->json();
        if (empty($data['access_token']) || empty($data['refresh_token'])) {
            throw new RuntimeException('Provider returned incomplete credentials.');
        }

        return $data;
    }

    public function accessToken(ProviderAuthorization $authorization): string
    {
        $authorization = ProviderAuthorization::whereKey($authorization->id)->lockForUpdate()->firstOrFail();
        if ($authorization->state !== 'active') {
            throw new RuntimeException('Connection authorization is inactive.');
        }
        if (now()->addMinute()->greaterThan($authorization->token_expires_at)) {
            $data = $this->token(['grant_type' => 'refresh_token', 'refresh_token' => $authorization->refresh_token]);
            $authorization->update(['access_token' => $data['access_token'], 'refresh_token' => $data['refresh_token'], 'token_expires_at' => now()->addSeconds($data['expires_in'] ?? 3600)]);
        }

        return $authorization->access_token;
    }

    public function get(string $token, string $path, array $query = [], bool $allowUnavailable = false): array
    {
        $response = Http::acceptJson()->withToken($token)->connectTimeout(5)->timeout(25)->get(config('finance.lunchflow_url').$path, $query);
        if ($allowUnavailable && $response->status() === 501) {
            return ['unsupported' => true];
        }
        if (! $response->successful()) {
            throw new RuntimeException('Provider read failed (HTTP '.$response->status().').');
        }
        $data = $response->json();
        if (! is_array($data)) {
            throw new RuntimeException('Invalid provider response.');
        }

        return $data;
    }

    public function transactions(string $token, string $account): array
    {
        $response = $this->get($token, '/accounts/'.rawurlencode($account).'/transactions', ['include_pending' => 'true']);
        if (! isset($response['transactions']) || ! is_array($response['transactions'])) {
            throw new RuntimeException('Invalid transaction response.');
        }

        return array_map(function ($row) {
            if (($row['currency'] ?? null) !== 'USD' || ! isset($row['id'],$row['date'],$row['amount'])) {
                throw new RuntimeException('Unsupported currency or incomplete transaction.');
            }

            return ['key' => (string) $row['id'], 'amount' => (string) $row['amount'], 'date' => $row['date'], 'payee' => ($row['merchant'] ?? null) ?: ($row['description'] ?? 'Transaction'), 'status' => ($row['isPending'] ?? false) ? 'pending' : 'posted'];
        }, $response['transactions']);
    }

    public function disconnect(string $token, string $connection): void
    {
        $response = Http::acceptJson()->withToken($token)->connectTimeout(5)->timeout(20)->delete(config('finance.lunchflow_url').'/connections/'.rawurlencode($connection));
        if (! $response->successful() && $response->status() !== 404) {
            throw new RuntimeException('Provider disconnect failed (HTTP '.$response->status().').');
        }
    }
}
