<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Models\NotificationPreference;
use App\Models\Settings;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use NotificationChannels\Telegram\Telegram;
use Tests\TestCase;

class TelegramWebhookControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Mock the Telegram class to prevent actual API calls
        $this->mock(Telegram::class, function ($mock) {
            $mock->shouldReceive('setToken')->andReturnSelf();
            $mock->shouldReceive('sendMessage')->andReturnNull();
        });

        Http::fake();
    }

    public function test_linking_telegram_with_token_enables_notifications_and_sends_web_app_button(): void
    {
        $user = User::factory()->create([
            'telegram_link_token' => 'valid-token',
            'telegram_link_token_expires_at' => now()->addMinutes(30),
        ]);

        NotificationPreference::create([
            'user_id' => $user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
            'telegram_enabled' => false,
        ]);

        $telegram = $this->mock(Telegram::class, function ($mock) {
            $mock->shouldReceive('setToken')->andReturnSelf();
            $mock->shouldReceive('sendMessage')
                ->once()
                ->withArgs(function (array $params) {
                    return str_contains($params['text'], 'Telegram account linked')
                        && isset($params['reply_markup'])
                        && str_contains($params['reply_markup'], 'web_app');
                })
                ->andReturnNull();
        });

        $response = $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => '/start valid-token',
                'chat' => ['id' => 123456],
            ],
        ]);

        $response->assertOk()->assertJson(['ok' => true]);

        $user->refresh();
        $this->assertSame('123456', (string) $user->telegram_chat_id);
        $this->assertNull($user->telegram_link_token);
        $this->assertNull($user->telegram_link_token_expires_at);

        foreach (NotificationType::cases() as $notificationType) {
            if ($notificationType === NotificationType::EMAIL_VERIFICATION) {
                continue;
            }

            $this->assertDatabaseHas('notification_preferences', [
                'user_id' => $user->id,
                'notification_type' => $notificationType->value,
                'telegram_enabled' => true,
            ]);
        }
    }

    public function test_start_without_token_auto_links_existing_user_and_shows_web_app_button(): void
    {
        $user = User::factory()->create([
            'telegram_user_id' => 555111,
            'telegram_chat_id' => null,
        ]);

        $telegram = $this->mock(Telegram::class, function ($mock) {
            $mock->shouldReceive('setToken')->andReturnSelf();
            $mock->shouldReceive('sendMessage')
                ->once()
                ->withArgs(function (array $params) {
                    return str_contains($params['text'], 'already linked')
                        && isset($params['reply_markup'])
                        && str_contains($params['reply_markup'], 'web_app');
                })
                ->andReturnNull();
        });

        $response = $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => '/start',
                'chat' => ['id' => 999888],
                'from' => [
                    'id' => 555111,
                    'first_name' => 'Test',
                ],
            ],
        ]);

        $response->assertOk()->assertJson(['ok' => true]);

        $user->refresh();
        $this->assertSame('999888', (string) $user->telegram_chat_id);

        foreach (NotificationType::cases() as $type) {
            if ($type === NotificationType::EMAIL_VERIFICATION) {
                continue;
            }
            $this->assertDatabaseHas('notification_preferences', [
                'user_id' => $user->id,
                'notification_type' => $type->value,
                'telegram_enabled' => true,
            ]);
        }
    }

    public function test_start_login_param_auto_links_existing_user(): void
    {
        $user = User::factory()->create([
            'telegram_user_id' => 555111,
            'telegram_chat_id' => null,
        ]);

        $response = $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => '/start login',
                'chat' => ['id' => 999888],
                'from' => [
                    'id' => 555111,
                    'first_name' => 'Test',
                ],
            ],
        ]);

        $response->assertOk();

        $user->refresh();
        $this->assertSame('999888', (string) $user->telegram_chat_id);
    }

    public function test_start_without_token_sends_create_account_keyboard_for_unknown_user(): void
    {
        $telegram = $this->mock(Telegram::class, function ($mock) {
            $mock->shouldReceive('setToken')->andReturnSelf();
            $mock->shouldReceive('sendMessage')
                ->once()
                ->withArgs(function (array $params) {
                    return str_contains($params['text'], 'create your account')
                        && isset($params['reply_markup'])
                        && str_contains($params['reply_markup'], 'create_account')
                        && ! str_contains($params['reply_markup'], 'link_account');
                })
                ->andReturnNull();
        });

        $response = $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => '/start',
                'chat' => ['id' => 777777],
                'from' => [
                    'id' => 999999,
                    'first_name' => 'New',
                ],
            ],
        ]);

        $response->assertOk();
    }

    public function test_callback_query_create_account_creates_user_and_sends_web_app_button(): void
    {
        $telegram = $this->mock(Telegram::class, function ($mock) {
            $mock->shouldReceive('setToken')->andReturnSelf();
            $mock->shouldReceive('sendMessage')
                ->once()
                ->withArgs(function (array $params) {
                    return str_contains($params['text'], 'account has been created')
                        && isset($params['reply_markup'])
                        && str_contains($params['reply_markup'], 'web_app');
                })
                ->andReturnNull();
        });

        $response = $this->postJson('/api/webhooks/telegram', [
            'callback_query' => [
                'id' => 'cb123',
                'data' => 'create_account',
                'from' => [
                    'id' => 111222,
                    'first_name' => 'Bot',
                    'last_name' => 'User',
                    'username' => 'botuser',
                ],
                'message' => [
                    'chat' => ['id' => 444555],
                ],
            ],
        ]);

        $response->assertOk();

        $user = User::where('telegram_user_id', 111222)->first();
        $this->assertNotNull($user);
        $this->assertSame('Bot User', $user->name);
        $this->assertSame('444555', (string) $user->telegram_chat_id);
    }

    public function test_start_create_account_param_creates_user_when_callback_updates_are_unavailable(): void
    {
        $telegram = $this->mock(Telegram::class, function ($mock) {
            $mock->shouldReceive('setToken')->andReturnSelf();
            $mock->shouldReceive('sendMessage')
                ->once()
                ->withArgs(function (array $params) {
                    return str_contains($params['text'], 'account has been created')
                        && isset($params['reply_markup'])
                        && str_contains($params['reply_markup'], 'web_app');
                })
                ->andReturnNull();
        });

        $response = $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => '/start create_account',
                'chat' => ['id' => 444555],
                'from' => [
                    'id' => 111222,
                    'first_name' => 'Bot',
                    'last_name' => 'User',
                    'username' => 'botuser',
                ],
            ],
        ]);

        $response->assertOk();

        $user = User::where('telegram_user_id', 111222)->first();
        $this->assertNotNull($user);
        $this->assertSame('Bot User', $user->name);
        $this->assertSame('444555', (string) $user->telegram_chat_id);
    }

    public function test_callback_query_create_account_blocked_by_invite_only(): void
    {
        Settings::set('invite_only_enabled', 'true');

        $response = $this->postJson('/api/webhooks/telegram', [
            'callback_query' => [
                'id' => 'cb456',
                'data' => 'create_account',
                'from' => [
                    'id' => 333444,
                    'first_name' => 'Blocked',
                ],
                'message' => [
                    'chat' => ['id' => 666777],
                ],
            ],
        ]);

        $response->assertOk();

        $this->assertDatabaseMissing('users', [
            'telegram_user_id' => 333444,
        ]);
    }

    public function test_start_auto_links_user_found_by_chat_id(): void
    {
        $user = User::factory()->create([
            'telegram_user_id' => null,
            'telegram_chat_id' => '777777',
        ]);

        $response = $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => '/start',
                'chat' => ['id' => 777777],
                'from' => [
                    'id' => 888888,
                    'first_name' => 'Test',
                ],
            ],
        ]);

        $response->assertOk();

        $user->refresh();
        $this->assertSame('777777', (string) $user->telegram_chat_id);
        $this->assertSame(888888, $user->telegram_user_id);
    }

    public function test_invalid_token_shows_settings_account_link(): void
    {
        $telegram = $this->mock(Telegram::class, function ($mock) {
            $mock->shouldReceive('setToken')->andReturnSelf();
            $mock->shouldReceive('sendMessage')
                ->once()
                ->withArgs(function (array $params) {
                    return str_contains($params['text'], '/settings/account');
                })
                ->andReturnNull();
        });

        $response = $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => '/start invalid-token-xyz',
                'chat' => ['id' => 111111],
            ],
        ]);

        $response->assertOk();
    }
}
