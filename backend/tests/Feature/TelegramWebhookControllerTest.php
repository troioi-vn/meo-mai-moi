<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TelegramWebhookControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_linking_telegram_enables_telegram_channel_for_all_notification_types(): void
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

        $response = $this->postJson('/api/webhooks/telegram', [
            'message' => [
                'text' => '/start valid-token',
                'chat' => [
                    'id' => 123456,
                ],
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
}
