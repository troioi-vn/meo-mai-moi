<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

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
        $response->assertJsonCount(3);
    }

    #[Test]
    public function test_authenticated_user_can_mark_notifications_as_read()
    {
        $user = User::factory()->create();
        Notification::factory()->count(5)->create(['user_id' => $user->id, 'is_read' => false]);

        $response = $this->actingAs($user)->postJson('/api/notifications/mark-as-read');

        $response->assertStatus(204);
        $this->assertDatabaseHas('notifications', ['user_id' => $user->id, 'is_read' => true]);
    }
}