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
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\EmailConfigurationService;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;
use Tests\Traits\CreatesUsers;

class EmailNotificationSystemIntegrationTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Set up a complete email configuration for testing
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

    public function test_complete_email_notification_system_workflow()
    {
        Queue::fake();
        Mail::fake();

        // Create users
        $owner = User::factory()->create(['email' => 'owner@test.com']);
        $helper = User::factory()->create(['email' => 'helper@test.com']);

        // Create pet and placement request
        $pet = Pet::factory()->create([
            'user_id' => $owner->id,
            'status' => \App\Enums\PetStatus::ACTIVE,
            'name' => 'Fluffy',
        ]);

        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'is_active' => true,
            'status' => PlacementRequestStatus::OPEN->value,
        ]);

        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        // Set up notification preferences
        NotificationPreference::create([
            'user_id' => $owner->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        NotificationPreference::create([
            'user_id' => $helper->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'email_enabled' => true,
            'in_app_enabled' => false,
        ]);

        NotificationPreference::create([
            'user_id' => $helper->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_REJECTED->value,
            'email_enabled' => false,
            'in_app_enabled' => true,
        ]);

        // Step 1: Helper responds to placement request
        $response = $this->actingAs($helper)->postJson('/api/transfer-requests', [
            'pet_id' => $pet->id,
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'requested_relationship_type' => 'fostering',
            'fostering_type' => 'free',
        ]);

        $response->assertStatus(201);
        $transferRequest = TransferRequest::latest()->first();

        // Verify owner got both email and in-app notifications
        $ownerNotifications = Notification::where('user_id', $owner->id)
            ->where('type', NotificationType::PLACEMENT_REQUEST_RESPONSE->value)
            ->get();

        $this->assertCount(2, $ownerNotifications);

        $emailNotification = $ownerNotifications->where('data.channel', 'email')->first();
        $inAppNotification = $ownerNotifications->where('data.channel', 'in_app')->first();

        $this->assertNotNull($emailNotification);
        $this->assertNotNull($inAppNotification);
        $this->assertNotNull($inAppNotification->delivered_at);
        $this->assertNull($emailNotification->delivered_at); // Will be set by job

        // Verify email job was queued
        Queue::assertPushed(SendNotificationEmail::class, 1);

        // Step 2: Owner accepts the helper's response
        $response = $this->actingAs($owner)->postJson("/api/transfer-requests/{$transferRequest->id}/accept");
        $response->assertStatus(200);

        // Verify helper got only email notification (per preferences)
        $helperNotifications = Notification::where('user_id', $helper->id)
            ->where('type', NotificationType::HELPER_RESPONSE_ACCEPTED->value)
            ->get();

        $this->assertCount(1, $helperNotifications);
        $this->assertEquals('email', $helperNotifications->first()->data['channel']);

        // Verify second email job was queued
        Queue::assertPushed(SendNotificationEmail::class, 2);

        // Step 3: Test rejection scenario with different helper
        $helper2 = User::factory()->create(['email' => 'helper2@test.com']);
        $helperProfile2 = HelperProfile::factory()->create(['user_id' => $helper2->id]);

        // Create another placement request
        $placementRequest2 = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'is_active' => true,
            'status' => PlacementRequestStatus::OPEN->value,
        ]);

        $transferRequest2 = TransferRequest::factory()->create([
            'pet_id' => $pet->id,
            'placement_request_id' => $placementRequest2->id,
            'helper_profile_id' => $helperProfile2->id,
            'initiator_user_id' => $helper2->id,
            'recipient_user_id' => $owner->id,
            'requester_id' => $helper2->id,
            'status' => 'pending',
        ]);

        // Set up preferences for helper2 (only in-app for rejection)
        NotificationPreference::create([
            'user_id' => $helper2->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_REJECTED->value,
            'email_enabled' => false,
            'in_app_enabled' => true,
        ]);

        // Owner rejects the second helper's response
        $response = $this->actingAs($owner)->postJson("/api/transfer-requests/{$transferRequest2->id}/reject");
        $response->assertStatus(200);

        // Verify helper2 got only in-app notification
        $helper2Notifications = Notification::where('user_id', $helper2->id)
            ->where('type', NotificationType::HELPER_RESPONSE_REJECTED->value)
            ->get();

        $this->assertCount(1, $helper2Notifications);
        $this->assertEquals('in_app', $helper2Notifications->first()->data['channel']);
        $this->assertNotNull($helper2Notifications->first()->delivered_at);

        // No additional email job should be queued
        Queue::assertPushed(SendNotificationEmail::class, 2);

        // Step 4: Test email job execution
        $emailJob = new SendNotificationEmail(
            $owner,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            ['pet_id' => $pet->id, 'helper_profile_id' => $helperProfile->id],
            $emailNotification->id
        );

        $emailJob->handle();

        // Verify notification was marked as delivered
        $emailNotification->refresh();
        $this->assertNotNull($emailNotification->delivered_at);
        $this->assertNull($emailNotification->failed_at);

        // Verify email was sent
        Mail::assertSent(\App\Mail\PlacementRequestResponseMail::class, function ($mail) use ($owner) {
            return $mail->hasTo($owner->email);
        });
    }

    public function test_email_configuration_service_integration_with_notifications()
    {
        $service = app(EmailConfigurationService::class);

        // Verify email is enabled with active configuration
        $this->assertTrue($service->isEmailEnabled());

        $activeConfig = $service->getActiveConfiguration();
        $this->assertNotNull($activeConfig);
        $this->assertEquals('smtp', $activeConfig->provider);

        // Verify mail configuration is properly set
        $mailConfig = $activeConfig->getMailConfig();
        $this->assertEquals('smtp', $mailConfig['default']);
        $this->assertEquals('smtp.example.com', $mailConfig['mailers']['smtp']['host']);

        // Deactivate configuration
        $service->deactivateConfiguration();

        // Verify email is now disabled
        $this->assertFalse($service->isEmailEnabled());
        $this->assertNull($service->getActiveConfiguration());
    }

    public function test_notification_preferences_api_integration()
    {
        $user = User::factory()->create();

        // Test getting preferences (should return defaults)
        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/notification-preferences');

        $response->assertStatus(200);
        $preferences = $response->json('data');

        $this->assertCount(count(NotificationType::cases()), $preferences);

        // All should default to enabled
        foreach ($preferences as $preference) {
            $this->assertTrue($preference['email_enabled']);
            $this->assertTrue($preference['in_app_enabled']);
        }

        // Test updating preferences
        $updateData = [
            'preferences' => [
                [
                    'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
                    'email_enabled' => false,
                    'in_app_enabled' => true,
                ],
                [
                    'type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
                    'email_enabled' => true,
                    'in_app_enabled' => false,
                ],
            ],
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/notification-preferences', $updateData);

        $response->assertStatus(200);

        // Verify preferences were saved
        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => false,
            'in_app_enabled' => true,
        ]);

        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $user->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'email_enabled' => true,
            'in_app_enabled' => false,
        ]);

        // Test getting updated preferences
        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/notification-preferences');

        $response->assertStatus(200);
        $preferences = $response->json('data');

        $placementResponse = collect($preferences)->firstWhere('type', NotificationType::PLACEMENT_REQUEST_RESPONSE->value);
        $helperAccepted = collect($preferences)->firstWhere('type', NotificationType::HELPER_RESPONSE_ACCEPTED->value);

        $this->assertFalse($placementResponse['email_enabled']);
        $this->assertTrue($placementResponse['in_app_enabled']);
        $this->assertTrue($helperAccepted['email_enabled']);
        $this->assertFalse($helperAccepted['in_app_enabled']);
    }

    public function test_unsubscribe_functionality_integration()
    {
        $user = User::factory()->create(['email' => 'test@example.com']);

        // Create notification preference
        NotificationPreference::create([
            'user_id' => $user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        // Generate unsubscribe token
        $token = hash_hmac('sha256', $user->id.NotificationType::PLACEMENT_REQUEST_RESPONSE->value, config('app.key'));

        // Test unsubscribe endpoint
        $response = $this->postJson('/api/unsubscribe', [
            'user' => $user->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'token' => $token,
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // Verify email notifications were disabled
        $preference = NotificationPreference::where('user_id', $user->id)
            ->where('notification_type', NotificationType::PLACEMENT_REQUEST_RESPONSE->value)
            ->first();

        $this->assertFalse($preference->email_enabled);
        $this->assertTrue($preference->in_app_enabled); // Should remain unchanged
    }

    public function test_email_template_rendering_integration()
    {
        Mail::fake();

        $user = User::factory()->create(['email' => 'test@example.com']);
        $pet = Pet::factory()->create(['name' => 'Fluffy']);
        $helperProfile = HelperProfile::factory()->create();

        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'data' => [
                'channel' => 'email',
                'pet_id' => $pet->id,
                'helper_profile_id' => $helperProfile->id,
            ],
        ]);

        $job = new SendNotificationEmail(
            $user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            [
                'pet_id' => $pet->id,
                'helper_profile_id' => $helperProfile->id,
            ],
            $notification->id
        );

        $job->handle();

        // Verify email was sent with correct template
        Mail::assertSent(\App\Mail\PlacementRequestResponseMail::class, function ($mail) use ($user, $pet) {
            $this->assertTrue($mail->hasTo($user->email));

            // Check that template data includes required fields
            $content = $mail->content();
            $templateData = $content->with;

            $this->assertArrayHasKey('user', $templateData);
            $this->assertArrayHasKey('pet', $templateData);
            $this->assertArrayHasKey('actionUrl', $templateData);
            $this->assertArrayHasKey('unsubscribeUrl', $templateData);

            $this->assertEquals($user->id, $templateData['user']->id);
            $this->assertEquals($pet->id, $templateData['pet']->id);

            return true;
        });
    }

    public function test_notification_system_performance_with_multiple_users()
    {
        Queue::fake();

        // Create multiple users with different preferences
        $users = User::factory()->count(10)->create();

        foreach ($users as $index => $user) {
            NotificationPreference::create([
                'user_id' => $user->id,
                'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
                'email_enabled' => $index % 2 === 0, // Half have email enabled
                'in_app_enabled' => $index % 3 === 0, // Third have in-app enabled
            ]);
        }

        $notificationService = app(NotificationService::class);

        // Send notifications to all users
        foreach ($users as $user) {
            $notificationService->send(
                $user,
                NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
                ['message' => 'Test notification', 'link' => '/test']
            );
        }

        // Verify correct number of notifications were created
        $totalNotifications = Notification::count();
        $emailJobs = Queue::pushed(SendNotificationEmail::class)->count();

        // Should have created notifications based on preferences
        $expectedEmailUsers = $users->filter(fn ($user, $index) => $index % 2 === 0)->count();
        $expectedInAppUsers = $users->filter(fn ($user, $index) => $index % 3 === 0)->count();

        $this->assertEquals($expectedEmailUsers, $emailJobs);
        $this->assertEquals($expectedEmailUsers + $expectedInAppUsers, $totalNotifications);
    }

    public function test_error_handling_and_recovery()
    {
        Queue::fake();

        $user = User::factory()->create(['email' => 'test@example.com']);

        // Set user preferences: only in-app enabled (no email)
        NotificationPreference::updatePreference(
            $user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            false, // email disabled
            true   // in-app enabled
        );

        // Test with invalid email configuration
        EmailConfiguration::query()->update(['is_active' => false]);

        $notificationService = app(NotificationService::class);

        // Should create in-app notification since it's enabled in preferences
        $notificationService->send(
            $user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            ['message' => 'Test notification', 'link' => '/test']
        );

        // Should have created only in-app notification
        $notifications = Notification::where('user_id', $user->id)->get();
        $this->assertCount(1, $notifications);
        $this->assertEquals('in_app', $notifications->first()->data['channel']);

        // No email job should be queued
        Queue::assertNotPushed(SendNotificationEmail::class);
    }
}
