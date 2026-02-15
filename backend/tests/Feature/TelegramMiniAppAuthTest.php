<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Settings;
use App\Models\User;
use Illuminate\Support\Str;
use Tests\TestCase;

class TelegramMiniAppAuthTest extends TestCase
{
    private string $botToken = '123456:test-telegram-bot-token';

    protected function setUp(): void
    {
        parent::setUp();

        Settings::set('telegram_bot_token', $this->botToken);
    }

    public function test_it_registers_and_authenticates_new_user_from_valid_init_data(): void
    {
        $initData = $this->buildInitData([
            'id' => 777001,
            'username' => 'mini_app_user',
            'first_name' => 'Mini',
            'last_name' => 'App',
        ]);

        $response = $this->postJson('/api/auth/telegram/miniapp', [
            'init_data' => $initData,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.created', true)
            ->assertJsonPath('data.linked_telegram', true)
            ->assertJsonPath('data.user.name', 'Mini App');

        $userId = $response->json('data.user.id');
        $this->assertIsInt($userId);

        $user = User::find($userId);
        $this->assertNotNull($user);
        $this->assertSame(777001, (int) $user->telegram_user_id);
        $this->assertSame('mini_app_user', $user->telegram_username);
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame('telegram_777001@telegram.meo-mai-moi.local', $user->email);
    }

    public function test_it_authenticates_existing_telegram_user(): void
    {
        $user = User::factory()->create([
            'telegram_user_id' => 998877,
            'telegram_username' => 'old_username',
            'telegram_first_name' => 'Old',
            'telegram_last_name' => 'Name',
        ]);

        $initData = $this->buildInitData([
            'id' => 998877,
            'username' => 'new_username',
            'first_name' => 'New',
            'last_name' => 'Person',
        ]);

        $response = $this->postJson('/api/auth/telegram/miniapp', [
            'init_data' => $initData,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.created', false);

        $user->refresh();
        $this->assertSame('new_username', $user->telegram_username);
        $this->assertSame('New', $user->telegram_first_name);
        $this->assertSame('Person', $user->telegram_last_name);
    }

    public function test_it_rejects_invalid_telegram_signature(): void
    {
        $initData = $this->buildInitData([
            'id' => 123,
            'username' => 'broken_sig',
        ]);

        $tampered = preg_replace('/hash=[a-f0-9]+/i', 'hash=deadbeef', $initData);

        $response = $this->postJson('/api/auth/telegram/miniapp', [
            'init_data' => $tampered,
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Invalid Telegram signature.');
    }

    public function test_it_rejects_expired_auth_payload(): void
    {
        $initData = $this->buildInitData([
            'id' => 456,
            'username' => 'expired_payload',
        ], time() - 3600);

        $response = $this->postJson('/api/auth/telegram/miniapp', [
            'init_data' => $initData,
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Telegram auth data expired.');
    }

    public function test_it_requires_invitation_code_when_invite_only_is_enabled(): void
    {
        Settings::set('invite_only_enabled', 'true');

        $initData = $this->buildInitData([
            'id' => 515151,
            'username' => 'invite_required',
        ]);

        $response = $this->postJson('/api/auth/telegram/miniapp', [
            'init_data' => $initData,
        ]);

        $response
            ->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Registration is invite-only. Please provide a valid invitation code.');

        $this->assertDatabaseMissing('users', [
            'telegram_user_id' => 515151,
        ]);
    }

    public function test_it_accepts_valid_invitation_code_in_invite_only_mode(): void
    {
        Settings::set('invite_only_enabled', 'true');

        $inviter = User::factory()->create();
        $invitation = Invitation::create([
            'code' => 'TG_VALID_INVITE',
            'inviter_user_id' => $inviter->id,
            'status' => 'pending',
        ]);

        $initData = $this->buildInitData([
            'id' => 616161,
            'username' => 'invite_ok',
            'first_name' => 'Invite',
            'last_name' => 'User',
        ]);

        $response = $this->postJson('/api/auth/telegram/miniapp', [
            'init_data' => $initData,
            'invitation_code' => 'TG_VALID_INVITE',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.created', true);

        $user = User::where('telegram_user_id', 616161)->first();
        $this->assertNotNull($user);

        $invitation->refresh();
        $this->assertSame('accepted', $invitation->status->value);
        $this->assertSame($user->id, $invitation->recipient_user_id);
    }

    public function test_it_rejects_rapid_replay_payload(): void
    {
        $queryId = 'q_'.Str::random(10);
        $initData = $this->buildInitData([
            'id' => 717171,
            'username' => 'replay_check',
        ], time(), $queryId);

        $first = $this->postJson('/api/auth/telegram/miniapp', [
            'init_data' => $initData,
        ]);
        $first->assertOk();

        $second = $this->postJson('/api/auth/telegram/miniapp', [
            'init_data' => $initData,
        ]);

        $second
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Duplicate Telegram auth payload.');
    }

    /**
     * @param array{id:int,username?:string,first_name?:string,last_name?:string,photo_url?:string} $telegramUser
     */
    private function buildInitData(array $telegramUser, ?int $authDate = null, ?string $queryId = null): string
    {
        $authDate ??= time();
        $queryId ??= 'query_'.Str::random(12);

        $userJson = json_encode($telegramUser, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $payload = [
            'auth_date' => (string) $authDate,
            'query_id' => $queryId,
            'user' => $userJson,
        ];

        ksort($payload);

        $checkString = collect($payload)
            ->map(fn (string $value, string $key): string => sprintf('%s=%s', $key, $value))
            ->implode("\n");

        $secretKey = hash_hmac('sha256', $this->botToken, 'WebAppData', true);
        $hash = hash_hmac('sha256', $checkString, $secretKey);

        $withHash = $payload;
        $withHash['hash'] = $hash;

        return http_build_query($withHash, '', '&', PHP_QUERY_RFC3986);
    }
}
