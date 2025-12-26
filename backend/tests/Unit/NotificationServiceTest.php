<?php

namespace Tests\Unit;

use App\Enums\NotificationType;
use App\Jobs\SendNotificationEmail;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class NotificationServiceTest extends TestCase
{
    use RefreshDatabase;

    private NotificationService $service;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new NotificationService;
        $this->user = User::factory()->create();
    }

    public function test_send_creates_both_email_and_in_app_notifications_when_both_enabled()
    {
        Queue::fake();

        // Set up preferences for both channels enabled
        NotificationPreference::updatePreference(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            true, // email enabled
            true  // in-app enabled
        );

        $data = [
            'message' => 'Test notification message',
            'link' => '/test-link',
        ];

        $this->service->send(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            $data
        );

        // Should create 2 notifications (one for email, one for in-app)
        $this->assertDatabaseCount('notifications', 2);

        // Should queue email job
        Queue::assertPushed(SendNotificationEmail::class);

        // Check in-app notification is marked as delivered
        $inAppNotification = Notification::where('user_id', $this->user->id)
            ->whereJsonContains('data->channel', 'in_app')
            ->first();

        $this->assertNotNull($inAppNotification);
        $this->assertNotNull($inAppNotification->delivered_at);
        $this->assertEquals($data['message'], $inAppNotification->message);
        $this->assertEquals($data['link'], $inAppNotification->link);
    }

    public function test_send_creates_only_email_notification_when_only_email_enabled()
    {
        Queue::fake();

        // Set up preferences for email only
        NotificationPreference::updatePreference(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            true,  // email enabled
            false  // in-app disabled
        );

        $data = [
            'message' => 'Test notification message',
            'link' => '/test-link',
        ];

        $this->service->send(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            $data
        );

        // Should create only 1 notification (for email)
        $this->assertDatabaseCount('notifications', 1);

        // Should queue email job
        Queue::assertPushed(SendNotificationEmail::class);

        // Check notification is for email channel
        $notification = Notification::where('user_id', $this->user->id)->first();
        $this->assertEquals('email', $notification->data['channel']);
    }

    public function test_send_creates_only_in_app_notification_when_only_in_app_enabled()
    {
        Queue::fake();

        // Set up preferences for in-app only
        NotificationPreference::updatePreference(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            false, // email disabled
            true   // in-app enabled
        );

        $data = [
            'message' => 'Test notification message',
            'link' => '/test-link',
        ];

        $this->service->send(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            $data
        );

        // Should create only 1 notification (for in-app)
        $this->assertDatabaseCount('notifications', 1);

        // Should not queue email job
        Queue::assertNotPushed(SendNotificationEmail::class);

        // Check notification is for in-app channel and delivered
        $notification = Notification::where('user_id', $this->user->id)->first();
        $this->assertEquals('in_app', $notification->data['channel']);
        $this->assertNotNull($notification->delivered_at);
    }

    public function test_send_creates_no_notifications_when_both_disabled()
    {
        Queue::fake();

        // Set up preferences for both disabled
        NotificationPreference::updatePreference(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            false, // email disabled
            false  // in-app disabled
        );

        $data = [
            'message' => 'Test notification message',
            'link' => '/test-link',
        ];

        $this->service->send(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            $data
        );

        // Should create no notifications
        $this->assertDatabaseCount('notifications', 0);

        // Should not queue email job
        Queue::assertNotPushed(SendNotificationEmail::class);
    }

    public function test_send_uses_default_preferences_when_none_exist()
    {
        Queue::fake();

        // Don't create any preferences - should use defaults (both enabled)
        $data = [
            'message' => 'Test notification message',
            'link' => '/test-link',
        ];

        $this->service->send(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            $data
        );

        // Should create 2 notifications (defaults to both enabled)
        $this->assertDatabaseCount('notifications', 2);

        // Should queue email job
        Queue::assertPushed(SendNotificationEmail::class);

        // Check that preference was created with defaults
        $preference = NotificationPreference::where('user_id', $this->user->id)
            ->where('notification_type', NotificationType::PLACEMENT_REQUEST_RESPONSE->value)
            ->first();

        $this->assertNotNull($preference);
        $this->assertTrue($preference->email_enabled);
        $this->assertTrue($preference->in_app_enabled);
    }

    public function test_send_email_creates_notification_record_with_correct_data()
    {
        Queue::fake();

        $data = [
            'message' => 'Test email notification',
            'link' => '/email-link',
            'extra_data' => 'some value',
        ];

        $this->service->sendEmail(
            $this->user,
            NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            $data
        );

        $notification = Notification::where('user_id', $this->user->id)->first();

        $this->assertNotNull($notification);
        $this->assertEquals(NotificationType::HELPER_RESPONSE_ACCEPTED->value, $notification->type);
        $this->assertEquals($data['message'], $notification->message);
        $this->assertEquals($data['link'], $notification->link);
        $this->assertEquals('email', $notification->data['channel']);
        $this->assertEquals($data['extra_data'], $notification->data['extra_data']);
        $this->assertFalse($notification->isRead());
        $this->assertNull($notification->delivered_at); // Email delivery handled by job
    }

    public function test_send_in_app_creates_notification_and_marks_delivered()
    {
        $data = [
            'message' => 'Test in-app notification',
            'link' => '/in-app-link',
        ];

        $this->service->sendInApp(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_ACCEPTED->value,
            $data
        );

        $notification = Notification::where('user_id', $this->user->id)->first();

        $this->assertNotNull($notification);
        $this->assertEquals(NotificationType::PLACEMENT_REQUEST_ACCEPTED->value, $notification->type);
        $this->assertEquals($data['message'], $notification->message);
        $this->assertEquals($data['link'], $notification->link);
        $this->assertEquals('in_app', $notification->data['channel']);
        $this->assertFalse($notification->isRead());
        $this->assertNotNull($notification->delivered_at); // Should be marked as delivered immediately
    }

    public function test_send_email_queues_job_with_correct_parameters()
    {
        Queue::fake();

        $data = [
            'message' => 'Test notification',
            'link' => '/test-link',
        ];

        $this->service->sendEmail(
            $this->user,
            NotificationType::HELPER_RESPONSE_REJECTED->value,
            $data
        );

        Queue::assertPushed(SendNotificationEmail::class, function ($job) use ($data) {
            return $job->user->id === $this->user->id
                && $job->type === NotificationType::HELPER_RESPONSE_REJECTED->value
                && $job->data === $data
                && is_int($job->notificationId);
        });
    }
}
