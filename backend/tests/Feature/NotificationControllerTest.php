<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class NotificationControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_authenticated_user_can_get_their_notifications()
    {
        $user = User::factory()->create();
        Notification::factory()->count(3)->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->getJson('/api/notifications');

        $response->assertStatus(200);
        $response->assertJsonCount(3, 'data');
    }

    #[Test]
    public function test_authenticated_user_can_mark_notifications_as_read()
    {
        $user = User::factory()->create();
        Notification::factory()->count(5)->create(['user_id' => $user->id, 'read_at' => null]);

        $response = $this->actingAs($user)->postJson('/api/notifications/mark-as-read');

        $response->assertStatus(204);
        $this->assertDatabaseMissing('notifications', ['user_id' => $user->id, 'read_at' => null]);
    }
}
