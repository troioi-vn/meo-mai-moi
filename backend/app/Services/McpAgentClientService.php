<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\McpAgentClientException;
use App\Models\McpAgentClient;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Headless MCP agent credentials.
 *
 * A user creates an agent client in the app and stores its secret with the
 * agent. The gateway's client_credentials grant hands that secret to
 * issueToken(), which mints a Sanctum token that lives one hour, so the
 * gateway never holds a long-lived delegation. Deleting the client deletes
 * every token minted for it, which ends the agent's access at once.
 */
class McpAgentClientService
{
    public const SECRET_PREFIX = 'meo_agent_';

    public const CLIENT_ID_PREFIX = 'meo_ac_';

    public const TOKEN_TTL_MINUTES = 60;

    public function __construct(private readonly McpConnectorService $connector) {}

    public function enabled(): bool
    {
        return (bool) config('services.mcp_connector.agent_clients_enabled', false);
    }

    /**
     * @param  list<string>  $scopes
     * @return array{client: McpAgentClient, secret: string}
     */
    public function create(User $user, string $name, array $scopes, ?CarbonInterface $expiresAt): array
    {
        if (! $this->enabled()) {
            throw McpAgentClientException::disabled();
        }
        if ($user->email_verified_at === null || $user->is_banned) {
            throw McpAgentClientException::accountNotAllowed();
        }
        $this->assertScopes($scopes);

        $secret = self::SECRET_PREFIX.Str::random(48);
        $client = McpAgentClient::create([
            'user_id' => $user->id,
            'name' => trim($name),
            'client_id' => self::CLIENT_ID_PREFIX.Str::lower(Str::random(24)),
            'secret_hash' => hash('sha256', $secret),
            'scopes' => array_values($scopes),
            'expires_at' => $expiresAt,
        ]);

        return ['client' => $client, 'secret' => $secret];
    }

    public function revoke(McpAgentClient $client): void
    {
        // Same row lock as issueToken(): a mint in flight finishes first and its
        // token is deleted here, or it starts after and finds no client.
        DB::transaction(function () use ($client): void {
            $locked = McpAgentClient::query()->whereKey($client->getKey())->lockForUpdate()->first();
            if ($locked === null) {
                return;
            }
            $locked->user->tokens()->where('name', $locked->tokenName())->delete();
            $locked->delete();
        });
    }

    /**
     * Trade a client id and secret for a fresh, short-lived Sanctum token.
     *
     * @param  list<string>|null  $requestedScopes  null means every scope the client holds
     * @return array{user_id:int, scopes:list<string>, sanctum_token:string, expires_at:string}
     */
    public function issueToken(string $clientId, string $secret, ?array $requestedScopes): array
    {
        if (! $this->enabled()) {
            throw McpAgentClientException::disabled();
        }

        return DB::transaction(fn (): array => $this->mintLocked($clientId, $secret, $requestedScopes));
    }

    /**
     * @param  list<string>|null  $requestedScopes
     * @return array{user_id:int, scopes:list<string>, sanctum_token:string, expires_at:string}
     */
    private function mintLocked(string $clientId, string $secret, ?array $requestedScopes): array
    {
        $client = McpAgentClient::query()->where('client_id', $clientId)->lockForUpdate()->first();
        // Hash even on a miss so a wrong id and a wrong secret take the same time.
        $presented = hash('sha256', $secret);
        if ($client === null || ! hash_equals($client->secret_hash, $presented)) {
            throw McpAgentClientException::invalidCredentials();
        }
        if ($client->expires_at !== null && $client->expires_at->isPast()) {
            throw McpAgentClientException::expired();
        }

        $user = $client->user;
        if ($user->email_verified_at === null || $user->is_banned) {
            throw McpAgentClientException::accountNotAllowed();
        }

        $scopes = $requestedScopes ?? $client->scopes;
        if ($scopes === [] || array_diff($scopes, $client->scopes) !== []) {
            throw McpAgentClientException::invalidScope();
        }
        $scopes = array_values(array_unique($scopes));

        $expiresAt = Carbon::now()->addMinutes(self::TOKEN_TTL_MINUTES);
        if ($client->expires_at !== null && $client->expires_at->lessThan($expiresAt)) {
            $expiresAt = Carbon::instance($client->expires_at);
        }

        // Housekeeping: an hourly agent would otherwise leave 24 dead rows a day.
        $user->tokens()
            ->where('name', $client->tokenName())
            ->where('expires_at', '<', Carbon::now())
            ->delete();

        $plainTextToken = $user->createToken(
            $client->tokenName(),
            $this->connector->abilitiesForScopes($scopes),
            $expiresAt,
        )->plainTextToken;

        $client->forceFill(['last_used_at' => Carbon::now()])->save();

        return [
            'user_id' => $user->id,
            'scopes' => $scopes,
            'sanctum_token' => $plainTextToken,
            'expires_at' => $expiresAt->toISOString(),
        ];
    }

    /** @param  array<int, mixed>  $scopes */
    private function assertScopes(array $scopes): void
    {
        $supported = $this->connector->supportedScopes();
        if ($scopes === [] || ! array_is_list($scopes) || count($scopes) !== count(array_unique($scopes))) {
            throw McpAgentClientException::invalidScope();
        }
        foreach ($scopes as $scope) {
            if (! is_string($scope) || ! in_array($scope, $supported, true)) {
                throw McpAgentClientException::invalidScope();
            }
        }
    }
}
