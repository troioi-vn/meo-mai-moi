<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class McpAuthEndpointsTest extends TestCase
{
    use RefreshDatabase;

    private const API_KEY = 'test-mcp-api-key';

    private const HMAC_SECRET = 'test-mcp-hmac-secret';

    private const ALLOWED_EMAIL = 'allowed-mcp-user@example.test';

    private const ALLOWED_BANNED_EMAIL = 'allowed-banned-mcp-user@example.test';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.mcp_connector.url' => 'https://mcp.example.test',
            'services.mcp_connector.api_key' => self::API_KEY,
            'services.mcp_connector.hmac_secret' => self::HMAC_SECRET,
            'services.mcp_connector.allowed_emails' => [
                self::ALLOWED_EMAIL,
                self::ALLOWED_BANNED_EMAIL,
            ],
        ]);

        Cache::flush();
    }

    public function test_allow_creates_read_only_single_use_exchange(): void
    {
        $user = User::factory()->create(['email' => self::ALLOWED_EMAIL]);
        $reference = $this->requestReference();

        $session = $this->getJson('/api/mcp-auth/session?request_ref='.urlencode($reference));
        $session->assertOk()
            ->assertJsonPath('data.client_name', 'Test MCP client')
            ->assertJsonPath('data.scopes.0', 'pets:read');

        $confirmed = $this->actingAs($user, 'sanctum')->postJson('/api/mcp-auth/confirm', [
            'request_ref' => $reference,
        ]);
        $confirmed->assertOk();

        parse_str((string) parse_url((string) $confirmed->json('data.redirect_url'), PHP_URL_QUERY), $query);
        $this->assertSame('https', parse_url((string) $confirmed->json('data.redirect_url'), PHP_URL_SCHEME));
        $this->assertSame('mcp.example.test', parse_url((string) $confirmed->json('data.redirect_url'), PHP_URL_HOST));
        $this->assertIsString($query['request_id'] ?? null);
        $this->assertIsString($query['code'] ?? null);

        $exchanged = $this->withToken(self::API_KEY)->postJson('/api/mcp-auth/exchange', [
            'code' => $query['code'],
        ]);
        $exchanged->assertOk()->assertJsonPath('data.user_id', $user->id);

        $plainTextToken = (string) $exchanged->json('data.sanctum_token');
        $token = PersonalAccessToken::findToken($plainTextToken);
        $this->assertNotNull($token);
        $this->assertSame(['read'], $token->abilities);

        $this->withToken($plainTextToken)->getJson('/api/my-pets')->assertOk();
        $this->withToken(self::API_KEY)
            ->postJson('/api/mcp-auth/exchange', ['code' => $query['code']])
            ->assertStatus(400);
    }

    public function test_deny_returns_access_denied_and_is_single_use(): void
    {
        $user = User::factory()->create(['email' => self::ALLOWED_EMAIL]);
        $reference = $this->requestReference();

        $denied = $this->actingAs($user, 'sanctum')->postJson('/api/mcp-auth/deny', [
            'request_ref' => $reference,
        ]);
        $denied->assertOk();
        parse_str((string) parse_url((string) $denied->json('data.redirect_url'), PHP_URL_QUERY), $query);
        $this->assertSame('access_denied', $query['error'] ?? null);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/mcp-auth/deny', ['request_ref' => $reference])
            ->assertStatus(400);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_confirm_requires_authentication(): void
    {
        $this->postJson('/api/mcp-auth/confirm', ['request_ref' => $this->requestReference()])
            ->assertUnauthorized();
    }

    public function test_confirm_rejects_unverified_banned_and_non_allowlisted_users(): void
    {
        $users = [
            User::factory()->unverified()->create(['email' => self::ALLOWED_EMAIL]),
            User::factory()->create(['email' => self::ALLOWED_BANNED_EMAIL, 'is_banned' => true]),
            User::factory()->create(['email' => 'not-allowed@example.test']),
        ];

        foreach ($users as $user) {
            $this->actingAs($user, 'sanctum')
                ->postJson('/api/mcp-auth/confirm', ['request_ref' => $this->requestReference()])
                ->assertForbidden();
        }

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_malformed_and_expired_references_are_rejected(): void
    {
        $this->getJson('/api/mcp-auth/session?request_ref=malformed')->assertStatus(400);
        $this->getJson('/api/mcp-auth/session?request_ref='.urlencode(
            $this->requestReference(expiresAt: now()->subSecond()->timestamp)
        ))->assertStatus(400);
        $this->getJson('/api/mcp-auth/session?request_ref='.urlencode(
            $this->requestReference(expiresAt: now()->addMinutes(11)->timestamp)
        ))->assertStatus(400);
    }

    public function test_exchange_rejects_missing_expired_and_replayed_codes_and_bad_connector_key(): void
    {
        $code = Str::random(64);
        Cache::put('mcp_auth_code:'.hash('sha256', $code), [
            'user_id' => 1,
            'sanctum_token' => '1|test',
        ], now()->addMinutes(5));

        $this->withToken('wrong-key')
            ->postJson('/api/mcp-auth/exchange', ['code' => $code])
            ->assertUnauthorized();
        $this->withToken(self::API_KEY)
            ->postJson('/api/mcp-auth/exchange', ['code' => Str::random(64)])
            ->assertStatus(400);

        $this->withToken(self::API_KEY)
            ->postJson('/api/mcp-auth/exchange', ['code' => $code])
            ->assertOk();
        $this->withToken(self::API_KEY)
            ->postJson('/api/mcp-auth/exchange', ['code' => $code])
            ->assertStatus(400);
    }

    public function test_revoke_is_authenticated_and_idempotent(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('mcp:test', ['read'])->plainTextToken;

        $this->withToken('wrong-key')
            ->postJson('/api/mcp-auth/revoke', ['token' => $token])
            ->assertUnauthorized();
        $this->assertNotNull(PersonalAccessToken::findToken($token));

        $this->withToken(self::API_KEY)
            ->postJson('/api/mcp-auth/revoke', ['token' => $token])
            ->assertOk();
        $this->assertNull(PersonalAccessToken::findToken($token));
        $this->withToken(self::API_KEY)
            ->postJson('/api/mcp-auth/revoke', ['token' => $token])
            ->assertOk();
    }

    private function requestReference(?int $expiresAt = null): string
    {
        $payload = [
            'request_id' => (string) Str::uuid(),
            'client_name' => 'Test MCP client',
            'scopes' => ['pets:read'],
            'exp' => $expiresAt ?? now()->addMinutes(10)->timestamp,
        ];
        $encoded = rtrim(strtr(base64_encode((string) json_encode($payload)), '+/', '-_'), '=');
        $signature = rtrim(strtr(
            base64_encode(hash_hmac('sha256', $encoded, self::HMAC_SECRET, true)),
            '+/',
            '-_'
        ), '=');

        return $encoded.'.'.$signature;
    }
}
