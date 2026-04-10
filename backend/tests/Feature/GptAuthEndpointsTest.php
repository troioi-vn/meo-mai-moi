<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\City;
use App\Models\PetType;
use App\Models\Settings;
use App\Models\User;
use App\Notifications\VerifyEmail;
use App\Services\EmailConfigurationService;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
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
        $sessionId = (string) Str::uuid();
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
        $this->assertSame(
            ['pet:read', 'pet:write', 'health:read', 'health:write', 'profile:read', 'create', 'read', 'update', 'delete'],
            $tokenModel->abilities
        );

        $this->withToken($sanctumToken)
            ->getJson('/api/my-pets')
            ->assertOk();

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
                'session_id' => (string) Str::uuid(),
                'session_sig' => 'invalid-signature',
            ]);

        $response->assertStatus(400);
    }

    public function test_confirm_rejects_replay_for_same_session_id(): void
    {
        $user = User::factory()->create();
        $sessionId = (string) Str::uuid();
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
        $sessionId = (string) Str::uuid();
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
                'code' => (string) Str::uuid(),
            ]);

        $response->assertStatus(401);
    }

    public function test_exchange_reports_server_misconfiguration_when_connector_api_key_is_missing(): void
    {
        config(['services.gpt_connector.api_key' => '']);
        Log::spy();

        $response = $this->postJson('/api/gpt-auth/exchange', [
            'code' => (string) Str::uuid(),
        ]);

        $response->assertStatus(503)
            ->assertJson([
                'success' => false,
                'message' => 'GPT connector is not configured.',
            ]);

        Log::shouldHaveReceived('warning')
            ->once()
            ->with('GPT connector API key is missing.');
    }

    public function test_register_allows_signup_without_invitation_and_sets_registered_via_gpt(): void
    {
        Settings::set('invite_only_enabled', 'true');
        app(SettingsService::class)->configureEmailVerificationRequirement(true);
        Notification::fake();
        $this->mock(EmailConfigurationService::class, function ($mock) {
            $mock->shouldReceive('isEmailEnabled')->andReturn(true);
        });

        $sessionId = (string) Str::uuid();
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
        $response->assertJsonPath('data.requires_verification', true);
        $response->assertJsonPath('data.email_verified', false);
        $response->assertJsonPath('data.email_sent', true);

        $user = User::where('email', 'gpt-user@example.com')->firstOrFail();
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_gpt_register_auto_verifies_when_email_verification_is_disabled(): void
    {
        app(SettingsService::class)->configureEmailVerificationRequirement(false);
        Notification::fake();

        $sessionId = (string) Str::uuid();
        $sessionSig = hash_hmac('sha256', $sessionId, self::HMAC_SECRET);

        $response = $this->postJson('/api/gpt-auth/register', [
            'session_id' => $sessionId,
            'session_sig' => $sessionSig,
            'name' => 'No Verify User',
            'email' => 'no-verify-gpt@example.com',
            'password' => 'Password1secure',
            'password_confirmation' => 'Password1secure',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.requires_verification', false)
            ->assertJsonPath('data.email_verified', true)
            ->assertJsonPath('data.email_sent', false);

        $user = User::where('email', 'no-verify-gpt@example.com')->firstOrFail();
        $this->assertNotNull($user->email_verified_at);
        Notification::assertNothingSent();
    }

    public function test_telegram_link_creates_short_lived_redirect_token_for_gpt_connect(): void
    {
        $sessionId = (string) Str::uuid();
        $sessionSig = hash_hmac('sha256', $sessionId, self::HMAC_SECRET);

        $response = $this->postJson('/api/gpt-auth/telegram-link', [
            'session_id' => $sessionId,
            'session_sig' => $sessionSig,
        ]);

        $response->assertOk();

        $token = (string) $response->json('data.telegram_login_token');
        $this->assertNotSame('', $token);
        $this->assertSame(
            "/gpt-connect?session_id={$sessionId}&session_sig={$sessionSig}",
            Cache::get("telegram-login-redirect:{$token}")
        );
    }

    public function test_gpt_exchange_token_can_create_pet_on_new_generic_pat_contract(): void
    {
        $user = User::factory()->create();
        $sessionId = (string) Str::uuid();
        $sessionSig = hash_hmac('sha256', $sessionId, self::HMAC_SECRET);
        $city = City::factory()->create([
            'country' => 'VN',
        ]);
        $petType = PetType::factory()->create([
            'slug' => 'cat',
        ]);

        $confirmResponse = $this
            ->actingAs($user, 'sanctum')
            ->postJson('/api/gpt-auth/confirm', [
                'session_id' => $sessionId,
                'session_sig' => $sessionSig,
            ]);

        $confirmResponse->assertOk();

        parse_str((string) parse_url((string) $confirmResponse->json('data.redirect_url'), PHP_URL_QUERY), $query);
        $code = $query['code'] ?? null;

        $exchangeResponse = $this
            ->withHeader('Authorization', 'Bearer '.self::API_KEY)
            ->postJson('/api/gpt-auth/exchange', [
                'code' => $code,
            ]);

        $exchangeResponse->assertOk();

        $sanctumToken = (string) $exchangeResponse->json('data.sanctum_token');

        $this->withToken($sanctumToken)
            ->postJson('/api/pets', [
                'name' => 'Connector Cat',
                'birthday' => '2020-01-01',
                'country' => 'VN',
                'city_id' => $city->id,
                'description' => 'Created via GPT connector token',
                'pet_type_id' => $petType->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Connector Cat');
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
