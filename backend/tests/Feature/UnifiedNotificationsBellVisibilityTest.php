<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class UnifiedNotificationsBellVisibilityTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function bell_unread_count_and_list_exclude_email_channel_notifications(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        Notification::factory()->create([
            'user_id' => $user->id,
            'read_at' => null,
            'data' => [
                'channel' => 'in_app',
                'title' => 'In-app notification',
            ],
        ]);

        Notification::factory()->create([
            'user_id' => $user->id,
            'read_at' => null,
            'data' => [
                'channel' => 'email',
                'title' => 'Email notification',
            ],
        ]);

        $res = $this->actingAs($user)->getJson('/api/notifications/unified');

        $res->assertOk();
        $res->assertJsonPath('data.unread_bell_count', 1);
        $res->assertJsonCount(1, 'data.bell_notifications');
        $res->assertJsonPath('data.bell_notifications.0.title', 'In-app notification');
    }

    #[Test]
    public function mark_all_read_only_marks_bell_visible_notifications(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $inApp = Notification::factory()->create([
            'user_id' => $user->id,
            'read_at' => null,
            'data' => [
                'channel' => 'in_app',
                'title' => 'In-app notification',
            ],
        ]);

        $email = Notification::factory()->create([
            'user_id' => $user->id,
            'read_at' => null,
            'data' => [
                'channel' => 'email',
                'title' => 'Email notification',
            ],
        ]);

        $this->actingAs($user)->postJson('/api/notifications/mark-all-read')->assertStatus(204);

        $this->assertDatabaseMissing('notifications', [
            'id' => $inApp->id,
            'read_at' => null,
        ]);

        $this->assertDatabaseHas('notifications', [
            'id' => $email->id,
            'read_at' => null,
        ]);
    }
}
