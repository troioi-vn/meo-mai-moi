<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Jobs\SendNotificationEmail;
use App\Models\EmailConfiguration;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class NotificationServiceIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_notification_service_integrates_with_existing_notification_system()
    {
        Queue::fake();

        $user = User::factory()->create();
        // Ensure email is considered enabled for this integration path
        EmailConfiguration::factory()->smtp()->valid()->create(['is_active' => true]);
        $service = new NotificationService;

        // Test with a real notification scenario
        $data = [
            'message' => 'Your response has been accepted!',
            'link' => '/pets/123/view',
            'pet_id' => 123,
            'pet_name' => 'Fluffy',
        ];

        $service->send(
            $user,
            NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            $data
        );

        // Verify notifications were created
        $this->assertDatabaseCount('notifications', 2);

        // Verify user can access their notifications through existing relationship
        $userNotifications = $user->notifications;
        $this->assertCount(2, $userNotifications);

        // Verify notification data is properly stored
        $inAppNotification = $userNotifications->where('data.channel', 'in_app')->first();
        $emailNotification = $userNotifications->where('data.channel', 'email')->first();

        $this->assertNotNull($inAppNotification);
        $this->assertNotNull($emailNotification);

        // Verify in-app notification is immediately available
        $this->assertNotNull($inAppNotification->delivered_at);
        $this->assertNull($emailNotification->delivered_at); // Will be set by job

        // Verify data integrity
        $this->assertEquals($data['message'], $inAppNotification->message);
        $this->assertEquals($data['link'], $inAppNotification->link);
        $this->assertEquals($data['pet_id'], $inAppNotification->data['pet_id']);
        $this->assertEquals($data['pet_name'], $inAppNotification->data['pet_name']);
    }

    public function test_notification_service_respects_user_preferences_across_multiple_types()
    {
        Queue::fake();

        $user = User::factory()->create();
        EmailConfiguration::factory()->smtp()->valid()->create(['is_active' => true]);
        $service = new NotificationService;

        // Set different preferences for different notification types
        NotificationPreference::updatePreference(
            $user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            true,  // email enabled
            false  // in-app disabled
        );

        NotificationPreference::updatePreference(
            $user,
            NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            false, // email disabled
            true   // in-app enabled
        );

        $data1 = ['message' => 'Response to your request', 'link' => '/requests/1'];
        $data2 = ['message' => 'Your helper response was accepted', 'link' => '/responses/1'];

        // Send different types of notifications
        $service->send($user, NotificationType::PLACEMENT_REQUEST_RESPONSE->value, $data1);
        $service->send($user, NotificationType::HELPER_RESPONSE_ACCEPTED->value, $data2);

        // Should have 2 notifications total (1 email + 1 in-app)
        $this->assertDatabaseCount('notifications', 2);

        // Verify correct channels were used
        $notifications = Notification::where('user_id', $user->id)->get();

        $emailNotification = $notifications->where('data.channel', 'email')->first();
        $inAppNotification = $notifications->where('data.channel', 'in_app')->first();

        $this->assertEquals(NotificationType::PLACEMENT_REQUEST_RESPONSE->value, $emailNotification->type);
        $this->assertEquals(NotificationType::HELPER_RESPONSE_ACCEPTED->value, $inAppNotification->type);

        // Verify email job was queued only once
        Queue::assertPushed(SendNotificationEmail::class, 1);
    }

    public function test_notification_service_handles_missing_data_gracefully()
    {
        Queue::fake();

        $user = User::factory()->create();
        EmailConfiguration::factory()->smtp()->valid()->create(['is_active' => true]);
        $service = new NotificationService;

        // Send notification with minimal data
        $data = []; // Empty data array

        $service->send(
            $user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            $data
        );

        // Should still create notifications
        $this->assertDatabaseCount('notifications', 2);

        $notification = Notification::query()
            ->where('user_id', $user->id)
            ->where('type', NotificationType::PLACEMENT_REQUEST_RESPONSE->value)
            ->where('data->channel', 'in_app')
            ->first();

        $this->assertNotNull($notification);

        // Should handle empty data gracefully (message/link may be filled via templates)
        $this->assertIsString($notification->message);
        $this->assertIsArray($notification->data);
    }

    public function test_notification_service_works_with_existing_notification_controller()
    {
        $user = User::factory()->create();
        EmailConfiguration::factory()->smtp()->valid()->create(['is_active' => true]);
        $service = new NotificationService;

        // Create notifications using the service
        $service->send(
            $user,
            NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            ['message' => 'Test notification', 'link' => '/test']
        );

        // Simulate API request to existing notification controller
        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/notifications');

        $response->assertStatus(200);

        $notifications = $response->json('data');
        $this->assertCount(2, $notifications); // Both email and in-app notifications

        // Verify the notifications are properly formatted for the frontend
        foreach ($notifications as $notification) {
            $this->assertArrayHasKey('id', $notification);
            $this->assertArrayHasKey('level', $notification);
            $this->assertArrayHasKey('title', $notification);
            $this->assertArrayHasKey('created_at', $notification);
        }
    }
}
