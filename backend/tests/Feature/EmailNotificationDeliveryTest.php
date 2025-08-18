<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Cat;
use App\Models\HelperProfile;
use App\Models\PlacementRequest;
use App\Models\TransferRequest;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\EmailConfiguration;
use App\Services\NotificationService;
use App\Jobs\SendNotificationEmail;
use App\Enums\NotificationType;
use App\Enums\PlacementRequestStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Mail;
use Tests\Traits\CreatesUsers;

class EmailNotificationDeliveryTest extends TestCase
{
    use RefreshDatabase, CreatesUsers;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Set up email configuration for testing
        EmailConfiguration::create([
            'provider' => 'smtp',
            'is_active' => true,
            'config' => [
                'host' => 'smtp.example.com',
                'port' => 587,
                'username' => 'test@example.com',
                'password' => 'password',
                'encryption' => 'tls',
                'from_address' => 'noreply@test.com',
                'from_name' => 'Test App'
            ]
        ]);
    }

    public function test_end_to_end_placement_request_response_notification()
    {
        Queue::fake();
        
        $owner = User::factory()->create(['email' => 'owner@test.com']);
        $helper = User::factory()->create(['email' => 'helper@test.com']);
        
        $cat = Cat::factory()->create([
            'user_id' => $owner->id,
            'status' => \App\Enums\CatStatus::ACTIVE,
            'name' => 'Fluffy'
        ]);
        
        $placementRequest = PlacementRequest::factory()->create([
            'cat_id' => $cat->id,
            'user_id' => $owner->id,
            'is_active' => true,
            'status' => PlacementRequestStatus::OPEN->value
        ]);
        
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        // Enable email notifications for owner
        NotificationPreference::create([
            'user_id' => $owner->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        // Create transfer request (simulates helper responding to placement request)
        $response = $this->actingAs($helper)->postJson('/api/transfer-requests', [
            'cat_id' => $cat->id,
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'requested_relationship_type' => 'fostering',
            'fostering_type' => 'free',
        ]);

        $response->assertStatus(201);
        $transferRequest = \App\Models\TransferRequest::latest()->first();

        // Verify notifications were created
        $notifications = Notification::where('user_id', $owner->id)
            ->where('type', NotificationType::PLACEMENT_REQUEST_RESPONSE->value)
            ->get();

        $this->assertCount(2, $notifications); // Email + in-app

        $emailNotification = $notifications->where('data.channel', 'email')->first();
        $inAppNotification = $notifications->where('data.channel', 'in_app')->first();

        $this->assertNotNull($emailNotification);
        $this->assertNotNull($inAppNotification);

        // Verify in-app notification is immediately delivered
        $this->assertNotNull($inAppNotification->delivered_at);
        $this->assertNull($emailNotification->delivered_at); // Will be set by job

        // Verify email job was queued
        Queue::assertPushed(SendNotificationEmail::class, function ($job) use ($owner, $emailNotification) {
            return $job->user->id === $owner->id &&
                   $job->type === NotificationType::PLACEMENT_REQUEST_RESPONSE->value &&
                   $job->notificationId === $emailNotification->id;
        });

        // Verify notification data
        $this->assertStringContainsString('Fluffy', $emailNotification->message);
        $this->assertEquals($cat->id, $emailNotification->data['cat_id']);
        $this->assertEquals($transferRequest->id, $emailNotification->data['transfer_request_id']);
    }

    public function test_helper_response_accepted_notification_flow()
    {
        Queue::fake();
        
        $owner = User::factory()->create(['email' => 'owner@test.com']);
        $helper = User::factory()->create(['email' => 'helper@test.com']);
        
        $cat = Cat::factory()->create([
            'user_id' => $owner->id,
            'status' => \App\Enums\CatStatus::ACTIVE,
            'name' => 'Whiskers'
        ]);
        
        $placementRequest = PlacementRequest::factory()->create([
            'cat_id' => $cat->id,
            'user_id' => $owner->id,
            'is_active' => true,
            'status' => PlacementRequestStatus::OPEN->value
        ]);
        
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        $transferRequest = TransferRequest::factory()->create([
            'cat_id' => $cat->id,
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'initiator_user_id' => $helper->id,
            'recipient_user_id' => $owner->id,
            'requester_id' => $helper->id,
            'status' => 'pending',
        ]);

        // Enable email notifications for helper
        NotificationPreference::create([
            'user_id' => $helper->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'email_enabled' => true,
            'in_app_enabled' => false, // Only email
        ]);

        // Accept the transfer request
        $response = $this->actingAs($owner)->postJson("/api/transfer-requests/{$transferRequest->id}/accept");
        $response->assertStatus(200);

        // Verify only email notification was created
        $notifications = Notification::where('user_id', $helper->id)
            ->where('type', NotificationType::HELPER_RESPONSE_ACCEPTED->value)
            ->get();

        $this->assertCount(1, $notifications);
        $this->assertEquals('email', $notifications->first()->data['channel']);

        // Verify email job was queued
        Queue::assertPushed(SendNotificationEmail::class, function ($job) use ($helper) {
            return $job->user->id === $helper->id &&
                   $job->type === NotificationType::HELPER_RESPONSE_ACCEPTED->value;
        });
    }

    public function test_helper_response_rejected_notification_flow()
    {
        Queue::fake();
        
        $owner = User::factory()->create(['email' => 'owner@test.com']);
        $helper = User::factory()->create(['email' => 'helper@test.com']);
        
        $cat = Cat::factory()->create([
            'user_id' => $owner->id,
            'status' => \App\Enums\CatStatus::ACTIVE,
            'name' => 'Mittens'
        ]);
        
        $placementRequest = PlacementRequest::factory()->create([
            'cat_id' => $cat->id,
            'user_id' => $owner->id,
            'is_active' => true,
            'status' => PlacementRequestStatus::OPEN->value
        ]);
        
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        $transferRequest = TransferRequest::factory()->create([
            'cat_id' => $cat->id,
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'initiator_user_id' => $helper->id,
            'recipient_user_id' => $owner->id,
            'requester_id' => $helper->id,
            'status' => 'pending',
        ]);

        // Enable both email and in-app notifications for helper
        NotificationPreference::create([
            'user_id' => $helper->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_REJECTED->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        // Reject the transfer request
        $response = $this->actingAs($owner)->postJson("/api/transfer-requests/{$transferRequest->id}/reject");
        $response->assertStatus(200);

        // Verify both notifications were created
        $notifications = Notification::where('user_id', $helper->id)
            ->where('type', NotificationType::HELPER_RESPONSE_REJECTED->value)
            ->get();

        $this->assertCount(2, $notifications);

        $emailNotification = $notifications->where('data.channel', 'email')->first();
        $inAppNotification = $notifications->where('data.channel', 'in_app')->first();

        $this->assertNotNull($emailNotification);
        $this->assertNotNull($inAppNotification);

        // Verify email job was queued
        Queue::assertPushed(SendNotificationEmail::class);
    }

    public function test_no_notifications_sent_when_email_disabled()
    {
        Queue::fake();
        
        $owner = User::factory()->create(['email' => 'owner@test.com']);
        $helper = User::factory()->create(['email' => 'helper@test.com']);
        
        $cat = Cat::factory()->create([
            'user_id' => $owner->id,
            'status' => \App\Enums\CatStatus::ACTIVE
        ]);
        
        $placementRequest = PlacementRequest::factory()->create([
            'cat_id' => $cat->id,
            'user_id' => $owner->id,
            'is_active' => true,
            'status' => PlacementRequestStatus::OPEN->value
        ]);
        
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        // Disable all notifications for owner
        NotificationPreference::create([
            'user_id' => $owner->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => false,
            'in_app_enabled' => false,
        ]);

        // Create transfer request
        $response = $this->actingAs($helper)->postJson('/api/transfer-requests', [
            'cat_id' => $cat->id,
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'requested_relationship_type' => 'fostering',
            'fostering_type' => 'free',
        ]);

        $response->assertStatus(201);

        // Verify no notifications were created
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $owner->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
        ]);

        // Verify no email job was queued
        Queue::assertNotPushed(SendNotificationEmail::class);
    }

    public function test_email_job_execution_marks_notification_as_delivered()
    {
        Mail::fake();
        
        $user = User::factory()->create(['email' => 'test@example.com']);
        
        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'data' => ['channel' => 'email', 'cat_id' => 1],
            'delivered_at' => null,
            'failed_at' => null,
        ]);

        $job = new SendNotificationEmail(
            $user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            ['cat_id' => 1],
            $notification->id
        );

        $job->handle();

        $notification->refresh();
        $this->assertNotNull($notification->delivered_at);
        $this->assertNull($notification->failed_at);
        $this->assertNull($notification->failure_reason);
    }

    public function test_email_job_failure_marks_notification_as_failed()
    {
        Mail::shouldReceive('to')->andReturnSelf();
        Mail::shouldReceive('send')->andThrow(new \Exception('SMTP connection failed'));
        
        $user = User::factory()->create(['email' => 'test@example.com']);
        
        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'data' => ['channel' => 'email'],
            'delivered_at' => null,
            'failed_at' => null,
        ]);

        $job = new SendNotificationEmail(
            $user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            [],
            $notification->id
        );

        try {
            $job->handle();
        } catch (\Exception $e) {
            // Expected to throw
        }

        // Simulate the failed() method being called
        $job->failed(new \Exception('SMTP connection failed'));

        $notification->refresh();
        $this->assertNull($notification->delivered_at);
        $this->assertNotNull($notification->failed_at);
        $this->assertEquals('SMTP connection failed', $notification->failure_reason);
    }

    public function test_notification_preferences_are_respected_across_multiple_users()
    {
        Queue::fake();
        
        $owner = User::factory()->create();
        $helper1 = User::factory()->create();
        $helper2 = User::factory()->create();
        
        $cat = Cat::factory()->create(['user_id' => $owner->id, 'status' => \App\Enums\CatStatus::ACTIVE]);
        $placementRequest = PlacementRequest::factory()->create([
            'cat_id' => $cat->id,
            'user_id' => $owner->id,
            'is_active' => true,
            'status' => PlacementRequestStatus::OPEN->value
        ]);
        
        $helperProfile1 = HelperProfile::factory()->create(['user_id' => $helper1->id]);
        $helperProfile2 = HelperProfile::factory()->create(['user_id' => $helper2->id]);

        // Set different preferences for each helper
        NotificationPreference::create([
            'user_id' => $helper1->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'email_enabled' => true,
            'in_app_enabled' => false,
        ]);

        NotificationPreference::create([
            'user_id' => $helper2->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_REJECTED->value,
            'email_enabled' => false,
            'in_app_enabled' => true,
        ]);

        // Create transfer requests for both helpers
        $transferRequest1 = TransferRequest::factory()->create([
            'cat_id' => $cat->id,
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile1->id,
            'initiator_user_id' => $helper1->id,
            'recipient_user_id' => $owner->id,
            'requester_id' => $helper1->id,
            'status' => 'pending',
        ]);

        $transferRequest2 = TransferRequest::factory()->create([
            'cat_id' => $cat->id,
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile2->id,
            'initiator_user_id' => $helper2->id,
            'recipient_user_id' => $owner->id,
            'requester_id' => $helper2->id,
            'status' => 'pending',
        ]);

        // Accept first transfer request and reject second
        $this->actingAs($owner)->postJson("/api/transfer-requests/{$transferRequest1->id}/accept");
        $this->actingAs($owner)->postJson("/api/transfer-requests/{$transferRequest2->id}/reject");

        // Verify helper1 got email notification only
        $helper1Notifications = Notification::where('user_id', $helper1->id)->get();
        $this->assertCount(1, $helper1Notifications);
        $this->assertEquals('email', $helper1Notifications->first()->data['channel']);

        // Verify helper2 got in-app notification only (for rejection)
        $helper2Notifications = Notification::where('user_id', $helper2->id)
            ->where('type', NotificationType::HELPER_RESPONSE_REJECTED->value)
            ->get();
        $this->assertCount(1, $helper2Notifications);
        $this->assertEquals('in_app', $helper2Notifications->first()->data['channel']);

        // Verify only one email job was queued (for helper1)
        Queue::assertPushed(SendNotificationEmail::class, 1);
    }
}