<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationResourceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a test user and authenticate
        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    public function test_notification_model_relationships()
    {
        $user = User::factory()->create();
        $notification = Notification::factory()->create(['user_id' => $user->id]);

        $this->assertInstanceOf(User::class, $notification->user);
        $this->assertEquals($user->id, $notification->user->id);
    }

    public function test_notification_type_display_attribute()
    {
        $notification = Notification::factory()->create(['type' => 'placement_request']);
        $this->assertEquals('Placement Request', $notification->type_display);

        $notification = Notification::factory()->create(['type' => 'transfer_accepted']);
        $this->assertEquals('Transfer Accepted', $notification->type_display);

        $notification = Notification::factory()->create(['type' => 'custom_type']);
        $this->assertEquals('Custom type', $notification->type_display);
    }

    public function test_notification_delivery_status_attribute()
    {
        // Test pending status
        $notification = Notification::factory()->create([
            'delivered_at' => null,
            'failed_at' => null,
        ]);
        $this->assertEquals('pending', $notification->delivery_status);

        // Test delivered status
        $notification = Notification::factory()->create([
            'delivered_at' => now(),
            'failed_at' => null,
        ]);
        $this->assertEquals('delivered', $notification->delivery_status);

        // Test failed status
        $notification = Notification::factory()->create([
            'delivered_at' => null,
            'failed_at' => now(),
        ]);
        $this->assertEquals('failed', $notification->delivery_status);
    }

    public function test_notification_engagement_status_attribute()
    {
        // Test not delivered
        $notification = Notification::factory()->create([
            'delivered_at' => null,
            'read_at' => null,
        ]);
        $this->assertEquals('not_delivered', $notification->engagement_status);

        // Test delivered but unread
        $notification = Notification::factory()->create([
            'delivered_at' => now(),
            'read_at' => null,
        ]);
        $this->assertEquals('delivered_unread', $notification->engagement_status);

        // Test read
        $notification = Notification::factory()->create([
            'delivered_at' => now(),
            'read_at' => now(),
        ]);
        $this->assertEquals('read', $notification->engagement_status);
    }

    public function test_notification_scopes()
    {
        // Create test notifications
        $unreadNotification = Notification::factory()->create(['is_read' => false]);
        $readNotification = Notification::factory()->create(['is_read' => true]);
        $deliveredNotification = Notification::factory()->create(['delivered_at' => now()]);
        $failedNotification = Notification::factory()->create(['failed_at' => now()]);
        $pendingNotification = Notification::factory()->create([
            'delivered_at' => null,
            'failed_at' => null,
        ]);

        // Test scopes
        $this->assertTrue(Notification::unread()->get()->contains($unreadNotification));
        $this->assertFalse(Notification::unread()->get()->contains($readNotification));

        $this->assertTrue(Notification::read()->get()->contains($readNotification));
        $this->assertFalse(Notification::read()->get()->contains($unreadNotification));

        $this->assertTrue(Notification::delivered()->get()->contains($deliveredNotification));
        $this->assertTrue(Notification::failed()->get()->contains($failedNotification));
        $this->assertTrue(Notification::pending()->get()->contains($pendingNotification));
    }

    public function test_notification_resource_can_list_notifications()
    {
        Notification::factory()->count(5)->create();

        $response = $this->get('/admin/notifications');
        $response->assertStatus(200);
    }

    public function test_notification_resource_can_create_notification()
    {
        $user = User::factory()->create();

        $response = $this->post('/admin/notifications', [
            'user_id' => $user->id,
            'type' => 'system_announcement',
            'message' => 'Test notification message',
            'link' => 'https://example.com',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => 'system_announcement',
            'message' => 'Test notification message',
            'link' => 'https://example.com',
        ]);
    }

    public function test_notification_resource_can_view_notification()
    {
        $notification = Notification::factory()->create();

        $response = $this->get("/admin/notifications/{$notification->id}");
        $response->assertStatus(200);
    }

    public function test_notification_resource_can_edit_notification()
    {
        $notification = Notification::factory()->create();

        $response = $this->get("/admin/notifications/{$notification->id}/edit");
        $response->assertStatus(200);
    }
}
