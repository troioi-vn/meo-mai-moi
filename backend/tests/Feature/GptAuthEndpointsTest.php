<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Settings;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class GptAuthEndpointsTest extends TestCase
{
    use RefreshDatabase;

    private const HMAC_SECRET = 'test-gpt-hmac-secret';

    private const API_KEY = 'test-gpt-api-key';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.gpt_connector.url' => 'https://gpt.example.com',
            'services.gpt_connector.api_key' => self::API_KEY,
            'services.gpt_connector.hmac_secret' => self::HMAC_SECRET,
        ]);

        Cache::flush();
    }

    public function test_confirm_creates_auth_code_and_exchange_returns_single_use_token_data(): void
    {
        $user = User::factory()->create();
        $sessionId = (string) \Illuminate\Support\Str::uuid();
        $sessionSig = hash_hmac('sha256', $sessionId, self::HMAC_SECRET);

        $confirmResponse = $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/gpt-auth/confirm', [
                'session_id' => $sessionId,
                'session_sig' => $sessionSig,
            ]);

        $confirmResponse->assertOk();
        $redirectUrl = (string) $confirmResponse->json('data.redirect_url');
        $this->assertStringContainsString('https://gpt.example.com/oauth/callback', $redirectUrl);

        parse_str((string) parse_url($redirectUrl, PHP_URL_QUERY), $query);
        $code = $query['code'] ?? null;

        $this->assertIsString($code);

        $exchangeResponse = $this
            ->withHeader('Authorization', 'Bearer '.self::API_KEY)
            ->postJson('/api/gpt-auth/exchange', [
                'code' => $code,
            ]);

        $exchangeResponse->assertOk();
        $exchangeResponse->assertJsonPath('data.user_id', $user->id);

        $sanctumToken = (string) $exchangeResponse->json('data.sanctum_token');
        $tokenModel = PersonalAccessToken::findToken($sanctumToken);

        $this->assertNotNull($tokenModel);
        $this->assertSame(['pet:read', 'pet:write', 'health:read', 'health:write', 'profile:read'], $tokenModel->abilities);

        $secondExchangeResponse = $this
            ->withHeader('Authorization', 'Bearer '.self::API_KEY)
            ->postJson('/api/gpt-auth/exchange', [
                'code' => $code,
            ]);

        $secondExchangeResponse->assertStatus(400);
    }

    public function test_confirm_rejects_invalid_signature(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/gpt-auth/confirm', [
                'session_id' => (string) \Illuminate\Support\Str::uuid(),
                'session_sig' => 'invalid-signature',
            ]);

        $response->assertStatus(400);
    }

    public function test_confirm_rejects_replay_for_same_session_id(): void
    {
        $user = User::factory()->create();
        $sessionId = (string) \Illuminate\Support\Str::uuid();
        $sessionSig = hash_hmac('sha256', $sessionId, self::HMAC_SECRET);

        $first = $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/gpt-auth/confirm', [
                'session_id' => $sessionId,
                'session_sig' => $sessionSig,
            ]);

        $first->assertOk();

        $second = $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/gpt-auth/confirm', [
                'session_id' => $sessionId,
                'session_sig' => $sessionSig,
            ]);

        $second->assertStatus(400);
    }

    public function test_confirm_with_missing_connector_url_has_no_side_effects(): void
    {
        config(['services.gpt_connector.url' => '']);

        $user = User::factory()->create();
        $sessionId = (string) \Illuminate\Support\Str::uuid();
        $sessionSig = hash_hmac('sha256', $sessionId, self::HMAC_SECRET);

        $response = $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/gpt-auth/confirm', [
                'session_id' => $sessionId,
                'session_sig' => $sessionSig,
            ]);

        $response->assertStatus(500);
        $this->assertFalse(Cache::has("gpt_confirm_used:{$sessionId}"));
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_exchange_requires_valid_connector_api_key(): void
    {
        $response = $this
            ->withHeader('Authorization', 'Bearer wrong-key')
            ->postJson('/api/gpt-auth/exchange', [
                'code' => (string) \Illuminate\Support\Str::uuid(),
            ]);

        $response->assertStatus(401);
    }

    public function test_register_allows_signup_without_invitation_and_sets_registered_via_gpt(): void
    {
        Settings::set('invite_only_enabled', 'true');

        $sessionId = (string) \Illuminate\Support\Str::uuid();
        $sessionSig = hash_hmac('sha256', $sessionId, self::HMAC_SECRET);

        $response = $this->postJson('/api/gpt-auth/register', [
            'session_id' => $sessionId,
            'session_sig' => $sessionSig,
            'name' => 'GPT User',
            'email' => 'gpt-user@example.com',
            'password' => 'Password1secure',
            'password_confirmation' => 'Password1secure',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'gpt-user@example.com',
            'registered_via_gpt' => true,
        ]);
    }

    public function test_revoke_deletes_token_and_is_idempotent(): void
    {
        $user = User::factory()->create();
        $plainTextToken = $user->createToken('gpt-connector', ['pet:read'])->plainTextToken;

        $first = $this
            ->withHeader('Authorization', 'Bearer '.self::API_KEY)
            ->postJson('/api/gpt-auth/revoke', [
                'token' => $plainTextToken,
            ]);

        $first->assertOk();
        $this->assertNull(PersonalAccessToken::findToken($plainTextToken));

        $second = $this
            ->withHeader('Authorization', 'Bearer '.self::API_KEY)
            ->postJson('/api/gpt-auth/revoke', [
                'token' => $plainTextToken,
            ]);

        $second->assertOk();
    }

    public function test_revoke_requires_valid_connector_api_key(): void
    {
        $user = User::factory()->create();
        $plainTextToken = $user->createToken('gpt-connector', ['pet:read'])->plainTextToken;

        $response = $this
            ->withHeader('Authorization', 'Bearer wrong-key')
            ->postJson('/api/gpt-auth/revoke', [
                'token' => $plainTextToken,
            ]);

        $response->assertStatus(401);
        $this->assertNotNull(PersonalAccessToken::findToken($plainTextToken));
    }
}
