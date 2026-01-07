<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Enums\PlacementRequestStatus;
use App\Jobs\SendNotificationEmail;
use App\Models\EmailConfiguration;
use App\Models\HelperProfile;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;
use Tests\Traits\CreatesUsers;

class EmailNotificationDeliveryTest extends TestCase
{
    use CreatesUsers;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

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
                'from_name' => 'Test App',
            ],
        ]);
    }

    public function test_end_to_end_placement_request_response_notification(): void
    {
        Queue::fake();

        $owner = User::factory()->create(['email' => 'owner@test.com']);
        $helper = User::factory()->create(['email' => 'helper@test.com']);

        $pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'status' => \App\Enums\PetStatus::ACTIVE,
            'name' => 'Fluffy',
        ]);

        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN->value,
        ]);

        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        NotificationPreference::create([
            'user_id' => $owner->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        $response = $this->actingAs($helper)->postJson("/api/placement-requests/{$placementRequest->id}/responses", [
            'message' => 'I want to help!',
        ]);
        $response->assertStatus(201);

        $placementResponse = \App\Models\PlacementRequestResponse::latest()->first();

        $notifications = Notification::where('user_id', $owner->id)
            ->where('type', NotificationType::PLACEMENT_REQUEST_RESPONSE->value)
            ->get();
        $this->assertCount(2, $notifications);

        $emailNotification = $notifications->where('data.channel', 'email')->first();
        $inAppNotification = $notifications->where('data.channel', 'in_app')->first();
        $this->assertNotNull($emailNotification);
        $this->assertNotNull($inAppNotification);
        $this->assertNotNull($inAppNotification->delivered_at);
        $this->assertNull($emailNotification->delivered_at);

        Queue::assertPushed(SendNotificationEmail::class, function ($job) use ($owner, $emailNotification) {
            return $job->user->id === $owner->id &&
                $job->type === NotificationType::PLACEMENT_REQUEST_RESPONSE->value &&
                $job->notificationId === $emailNotification->id;
        });

        $this->assertEquals($pet->id, $emailNotification->data['pet_id']);
        $this->assertEquals($placementResponse->id, $emailNotification->data['placement_response_id']);
    }

    public function test_helper_response_accepted_notification_flow(): void
    {
        Queue::fake();

        $owner = User::factory()->create(['email' => 'owner@test.com']);
        $helper = User::factory()->create(['email' => 'helper@test.com']);

        $pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'status' => \App\Enums\PetStatus::ACTIVE,
            'name' => 'Whiskers',
        ]);

        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN->value,
        ]);

        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        $placementResponse = \App\Models\PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => \App\Enums\PlacementResponseStatus::RESPONDED,
        ]);

        NotificationPreference::create([
            'user_id' => $helper->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'email_enabled' => true,
            'in_app_enabled' => false,
        ]);

        $this->actingAs($owner)->postJson("/api/placement-responses/{$placementResponse->id}/accept")
            ->assertStatus(200);

        $notifications = Notification::where('user_id', $helper->id)
            ->where('type', NotificationType::HELPER_RESPONSE_ACCEPTED->value)
            ->get();
        $this->assertCount(1, $notifications);
        $this->assertEquals('email', $notifications->first()->data['channel']);

        Queue::assertPushed(SendNotificationEmail::class, function ($job) use ($helper) {
            return $job->user->id === $helper->id &&
                $job->type === NotificationType::HELPER_RESPONSE_ACCEPTED->value;
        });
    }

    public function test_helper_response_rejected_notification_flow(): void
    {
        Queue::fake();

        $owner = User::factory()->create(['email' => 'owner@test.com']);
        $helper = User::factory()->create(['email' => 'helper@test.com']);

        $pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'status' => \App\Enums\PetStatus::ACTIVE,
            'name' => 'Mittens',
        ]);

        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN->value,
        ]);

        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        $placementResponse = \App\Models\PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => \App\Enums\PlacementResponseStatus::RESPONDED,
        ]);

        NotificationPreference::create([
            'user_id' => $helper->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_REJECTED->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        $this->actingAs($owner)->postJson("/api/placement-responses/{$placementResponse->id}/reject")
            ->assertStatus(200);

        $notifications = Notification::where('user_id', $helper->id)
            ->where('type', NotificationType::HELPER_RESPONSE_REJECTED->value)
            ->get();
        $this->assertCount(2, $notifications);
        $this->assertNotNull($notifications->where('data.channel', 'email')->first());
        $this->assertNotNull($notifications->where('data.channel', 'in_app')->first());

        Queue::assertPushed(SendNotificationEmail::class);
    }

    public function test_no_notifications_sent_when_email_disabled(): void
    {
        Queue::fake();

        $owner = User::factory()->create(['email' => 'owner@test.com']);
        $helper = User::factory()->create(['email' => 'helper@test.com']);

        $pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'status' => \App\Enums\PetStatus::ACTIVE,
        ]);

        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN->value,
        ]);

        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        NotificationPreference::create([
            'user_id' => $owner->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => false,
            'in_app_enabled' => false,
        ]);

        $this->actingAs($helper)->postJson("/api/placement-requests/{$placementRequest->id}/responses", [
            'helper_profile_id' => $helperProfile->id,
            'notes' => 'I can help!',
        ])->assertStatus(201);

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $owner->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
        ]);
        Queue::assertNotPushed(SendNotificationEmail::class);
    }

    public function test_email_job_execution_marks_notification_as_delivered(): void
    {
        Mail::fake();
        $user = User::factory()->create(['email' => 'test@example.com']);

        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'data' => ['channel' => 'email', 'pet_id' => 1],
            'delivered_at' => null,
            'failed_at' => null,
        ]);

        $job = new SendNotificationEmail(
            $user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            ['pet_id' => 1],
            $notification->id
        );
        $job->handle();

        $notification->refresh();
        $this->assertNotNull($notification->delivered_at);
        $this->assertNull($notification->failed_at);
        $this->assertNull($notification->failure_reason);
    }

    public function test_email_job_failure_marks_notification_as_failed(): void
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
        }
        $job->failed(new \Exception('SMTP connection failed'));

        $notification->refresh();
        $this->assertNull($notification->delivered_at);
        $this->assertNotNull($notification->failed_at);
        $this->assertEquals('SMTP connection failed', $notification->failure_reason);
    }

    public function test_notification_preferences_are_respected_across_multiple_users(): void
    {
        Queue::fake();
        $owner = User::factory()->create();
        $helper1 = User::factory()->create();
        $helper2 = User::factory()->create();

        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN->value,
            'request_type' => \App\Enums\PlacementRequestType::FOSTER_FREE,
        ]);
        $helperProfile1 = HelperProfile::factory()->create(['user_id' => $helper1->id]);
        $helperProfile2 = HelperProfile::factory()->create(['user_id' => $helper2->id]);

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

        $placementResponse1 = \App\Models\PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile1->id,
            'status' => \App\Enums\PlacementResponseStatus::RESPONDED,
        ]);
        $placementResponse2 = \App\Models\PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile2->id,
            'status' => \App\Enums\PlacementResponseStatus::RESPONDED,
        ]);

        $this->actingAs($owner)->postJson("/api/placement-responses/{$placementResponse1->id}/accept");
        $this->actingAs($owner)->postJson("/api/placement-responses/{$placementResponse2->id}/reject");

        $helper1Notifications = Notification::where('user_id', $helper1->id)->get();
        $this->assertCount(1, $helper1Notifications);
        $this->assertEquals('email', $helper1Notifications->first()->data['channel']);

        $helper2Notifications = Notification::where('user_id', $helper2->id)
            ->where('type', NotificationType::HELPER_RESPONSE_REJECTED->value)
            ->get();
        $this->assertCount(1, $helper2Notifications);
        $this->assertEquals('in_app', $helper2Notifications->first()->data['channel']);

        Queue::assertPushed(SendNotificationEmail::class, 1);
    }
}
