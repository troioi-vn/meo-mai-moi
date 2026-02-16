<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Settings;
use App\Models\User;
use Tests\TestCase;

class TelegramLoginWidgetAuthTest extends TestCase
{
    private string $botToken = '123456:test-telegram-bot-token';

    protected function setUp(): void
    {
        parent::setUp();

        Settings::set('telegram_bot_token', $this->botToken);
    }

    public function test_it_registers_and_authenticates_new_user_from_valid_widget_data(): void
    {
        $widgetData = $this->buildWidgetData([
            'id' => 777001,
            'username' => 'widget_user',
            'first_name' => 'Widget',
            'last_name' => 'User',
        ]);

        $response = $this->postJson('/api/auth/telegram/widget', $widgetData);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.created', true)
            ->assertJsonPath('data.linked_telegram', true)
            ->assertJsonPath('data.user.name', 'Widget User');

        $userId = $response->json('data.user.id');
        $this->assertIsInt($userId);

        $user = User::find($userId);
        $this->assertNotNull($user);
        $this->assertSame(777001, (int) $user->telegram_user_id);
        $this->assertSame('widget_user', $user->telegram_username);
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

        $widgetData = $this->buildWidgetData([
            'id' => 998877,
            'username' => 'new_username',
            'first_name' => 'New',
            'last_name' => 'Person',
        ]);

        $response = $this->postJson('/api/auth/telegram/widget', $widgetData);

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
        $widgetData = $this->buildWidgetData([
            'id' => 123,
            'username' => 'broken_sig',
        ]);

        $widgetData['hash'] = 'deadbeef';

        $response = $this->postJson('/api/auth/telegram/widget', $widgetData);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Invalid Telegram signature.');
    }

    public function test_it_rejects_expired_auth_payload(): void
    {
        $widgetData = $this->buildWidgetData([
            'id' => 456,
            'username' => 'expired_payload',
        ], time() - 3600);

        $response = $this->postJson('/api/auth/telegram/widget', $widgetData);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Telegram auth data expired.');
    }

    public function test_it_requires_invitation_code_when_invite_only_is_enabled(): void
    {
        Settings::set('invite_only_enabled', 'true');

        $widgetData = $this->buildWidgetData([
            'id' => 515151,
            'username' => 'invite_required',
        ]);

        $response = $this->postJson('/api/auth/telegram/widget', $widgetData);

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
        Invitation::create([
            'code' => 'TG_WIDGET_INVITE',
            'inviter_user_id' => $inviter->id,
            'status' => 'pending',
        ]);

        $widgetData = $this->buildWidgetData([
            'id' => 616161,
            'username' => 'invite_ok',
            'first_name' => 'Invite',
            'last_name' => 'User',
        ]);
        $widgetData['invitation_code'] = 'TG_WIDGET_INVITE';

        $response = $this->postJson('/api/auth/telegram/widget', $widgetData);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.created', true);

        $user = User::where('telegram_user_id', 616161)->first();
        $this->assertNotNull($user);

        $invitation = Invitation::where('code', 'TG_WIDGET_INVITE')->first();
        $this->assertSame('accepted', $invitation->status->value);
        $this->assertSame($user->id, $invitation->recipient_user_id);
    }

    public function test_it_rejects_rapid_replay_payload(): void
    {
        $widgetData = $this->buildWidgetData([
            'id' => 717171,
            'username' => 'replay_check',
        ]);

        $first = $this->postJson('/api/auth/telegram/widget', $widgetData);
        $first->assertOk();

        $second = $this->postJson('/api/auth/telegram/widget', $widgetData);

        $second
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Duplicate Telegram auth payload.');
    }

    /**
     * @param  array{id: int, username?: string, first_name?: string, last_name?: string, photo_url?: string}  $telegramUser
     * @return array<string, mixed>
     */
    private function buildWidgetData(array $telegramUser, ?int $authDate = null): array
    {
        $authDate ??= time();

        $payload = array_filter([
            'auth_date' => (string) $authDate,
            'first_name' => $telegramUser['first_name'] ?? null,
            'id' => (string) $telegramUser['id'],
            'last_name' => $telegramUser['last_name'] ?? null,
            'photo_url' => $telegramUser['photo_url'] ?? null,
            'username' => $telegramUser['username'] ?? null,
        ], fn ($v) => $v !== null);

        ksort($payload);

        $checkString = collect($payload)
            ->map(fn (string $value, string $key): string => sprintf('%s=%s', $key, $value))
            ->implode("\n");

        // Login Widget uses SHA256(bot_token) as secret
        $secretKey = hash('sha256', $this->botToken, true);
        $hash = hash_hmac('sha256', $checkString, $secretKey);

        $result = [];
        foreach ($payload as $key => $value) {
            $result[$key] = is_numeric($value) && in_array($key, ['id', 'auth_date']) ? (int) $value : $value;
        }
        $result['hash'] = $hash;

        return $result;
    }
}
