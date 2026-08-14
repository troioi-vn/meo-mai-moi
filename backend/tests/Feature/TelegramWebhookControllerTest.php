<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Models\NotificationPreference;
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
        config()->set('telegram.user_bot.token', 'test-token');
        config()->set('app.url', 'https://app.example.test');
        config()->set('app.frontend_url', 'https://app.example.test');
        Http::fake();
        $this->mock(Telegram::class, function ($mock): void {
            $mock->shouldReceive('setToken')->andReturnSelf();
            $mock->shouldReceive('sendMessage')->andReturnNull();
        });
    }

    public function test_bare_start_creates_an_account_without_a_callback_button(): void
    {
        $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => '/start',
                'chat' => ['id' => 777777],
                'from' => ['id' => 999999, 'first_name' => 'New'],
            ],
        ])->assertOk()->assertJson(['ok' => true]);

        $this->assertDatabaseHas('users', [
            'telegram_user_id' => 999999,
            'telegram_chat_id' => '777777',
        ]);
    }

    public function test_linking_telegram_with_token_preserves_the_settings_flow(): void
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

        $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => '/start valid-token',
                'chat' => ['id' => 123456],
                'from' => ['id' => 123456, 'first_name' => 'Current'],
            ],
        ])->assertOk();

        $user->refresh();
        $this->assertSame('123456', (string) $user->telegram_chat_id);
        $this->assertSame(123456, $user->telegram_user_id);
        $this->assertNull($user->telegram_link_token);
        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'telegram_enabled' => true,
        ]);
    }

    public function test_webhook_rejects_invalid_secret_tokens(): void
    {
        config()->set('telegram.user_bot.webhook_secret_token', 'expected-secret');

        $this->withHeader('X-Telegram-Bot-Api-Secret-Token', 'wrong-secret')
            ->postJson('/api/webhooks/telegram', [
                'message' => [
                    'text' => '/start',
                    'chat' => ['id' => 777777],
                    'from' => ['id' => 999999, 'first_name' => 'New'],
                ],
            ])
            ->assertForbidden()
            ->assertJson(['ok' => false]);

        $this->assertDatabaseMissing('users', ['telegram_user_id' => 999999]);
    }
}
