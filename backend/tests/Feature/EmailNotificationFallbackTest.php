<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Services\NotificationService;
use App\Jobs\SendNotificationEmail;
use App\Enums\NotificationType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class EmailNotificationFallbackTest extends TestCase
{
    use RefreshDatabase;

    private NotificationService $service;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(NotificationService::class);
        $this->user = User::factory()->create(['email' => 'test@example.com']);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_creates_fallback_notification_when_email_fails_and_in_app_not_enabled()
    {
        // Set user preferences: email enabled, in-app disabled
        NotificationPreference::updatePreference(
            $this->user, 
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value, 
            true, // email enabled
            false // in-app disabled
        );

        // Mock email configuration service to return false (email not enabled)
        $mockEmailService = $this->createMock(\App\Services\EmailConfigurationService::class);
        $mockEmailService->method('isEmailEnabled')->willReturn(false);
        
        $this->app->instance(\App\Services\EmailConfigurationService::class, $mockEmailService);
        
        // Create service with mocked dependency
        $service = new NotificationService($mockEmailService);

        // Send notification
        $service->send($this->user, NotificationType::PLACEMENT_REQUEST_RESPONSE->value, [
            'message' => 'Test notification',
            'link' => '/test'
        ]);

        // Should create a fallback in-app notification
        $fallbackNotification = Notification::where('user_id', $this->user->id)
            ->whereJsonContains('data->is_fallback', true)
            ->first();

        $this->assertNotNull($fallbackNotification);
        $this->assertEquals('in_app_fallback', $fallbackNotification->data['channel']);
        $this->assertEquals('email', $fallbackNotification->data['original_channel']);
        $this->assertNotNull($fallbackNotification->delivered_at);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_does_not_create_fallback_when_in_app_already_enabled()
    {
        // Set user preferences: both email and in-app enabled
        NotificationPreference::updatePreference(
            $this->user, 
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value, 
            true, // email enabled
            true  // in-app enabled
        );

        // Mock email configuration service to return false (email not enabled)
        $mockEmailService = $this->createMock(\App\Services\EmailConfigurationService::class);
        $mockEmailService->method('isEmailEnabled')->willReturn(false);
        
        $this->app->instance(\App\Services\EmailConfigurationService::class, $mockEmailService);
        
        // Create service with mocked dependency
        $service = new NotificationService($mockEmailService);

        // Send notification
        $service->send($this->user, NotificationType::PLACEMENT_REQUEST_RESPONSE->value, [
            'message' => 'Test notification',
            'link' => '/test'
        ]);

        // Should create regular in-app notification, not fallback
        $regularNotification = Notification::where('user_id', $this->user->id)
            ->whereJsonContains('data->channel', 'in_app')
            ->first();

        $fallbackNotification = Notification::where('user_id', $this->user->id)
            ->whereJsonContains('data->is_fallback', true)
            ->first();

        $this->assertNotNull($regularNotification);
        $this->assertNull($fallbackNotification);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_creates_fallback_notification_when_email_job_fails()
    {
        Queue::fake();

        // Set user preferences: email enabled, in-app disabled
        NotificationPreference::updatePreference(
            $this->user, 
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value, 
            true, // email enabled
            false // in-app disabled
        );

        // Create a notification for email delivery
        $notification = Notification::create([
            'user_id' => $this->user->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'message' => 'Test notification',
            'link' => '/test',
            'data' => ['channel' => 'email'],
            'is_read' => false,
        ]);

        // Create and fail the email job
        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            ['message' => 'Test notification', 'link' => '/test'],
            $notification->id
        );

        // Simulate job failure
        $exception = new \Exception('SMTP connection failed');
        $job->failed($exception);

        // Should create a fallback notification
        $fallbackNotification = Notification::where('user_id', $this->user->id)
            ->whereJsonContains('data->is_fallback', true)
            ->first();

        $this->assertNotNull($fallbackNotification);
        $this->assertEquals('in_app_fallback', $fallbackNotification->data['channel']);
        $this->assertEquals('email', $fallbackNotification->data['original_channel']);
        $this->assertStringContainsString('Email delivery failed', $fallbackNotification->data['fallback_reason']);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_does_not_create_duplicate_fallback_when_user_has_in_app_enabled()
    {
        Queue::fake();

        // Set user preferences: both enabled
        NotificationPreference::updatePreference(
            $this->user, 
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value, 
            true, // email enabled
            true  // in-app enabled
        );

        // Create a notification for email delivery
        $notification = Notification::create([
            'user_id' => $this->user->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'message' => 'Test notification',
            'link' => '/test',
            'data' => ['channel' => 'email'],
            'is_read' => false,
        ]);

        // Create and fail the email job
        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            ['message' => 'Test notification', 'link' => '/test'],
            $notification->id
        );

        // Simulate job failure
        $exception = new \Exception('SMTP connection failed');
        $job->failed($exception);

        // Should NOT create a fallback notification since user already has in-app enabled
        $fallbackNotification = Notification::where('user_id', $this->user->id)
            ->whereJsonContains('data->is_fallback', true)
            ->first();

        $this->assertNull($fallbackNotification);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_provides_email_configuration_status()
    {
        // Mock email configuration service
        $mockEmailService = $this->createMock(\App\Services\EmailConfigurationService::class);
        $mockEmailService->method('getActiveConfiguration')->willReturn(null);
        
        $service = new NotificationService($mockEmailService);

        $status = $service->getEmailConfigurationStatus();

        $this->assertFalse($status['enabled']);
        $this->assertEquals('no_configuration', $status['status']);
        $this->assertEquals('No email configuration found', $status['message']);
    }

    #[\PHPUnit\Framework\Attributes\Test]
    public function it_handles_email_service_errors_gracefully()
    {
        // Mock email configuration service to throw exception
        $mockEmailService = $this->createMock(\App\Services\EmailConfigurationService::class);
        $mockEmailService->method('isEmailEnabled')->willThrowException(new \Exception('Service error'));
        
        $service = new NotificationService($mockEmailService);

        // Should not throw exception, should handle gracefully
        $service->send($this->user, NotificationType::PLACEMENT_REQUEST_RESPONSE->value, [
            'message' => 'Test notification',
            'link' => '/test'
        ]);

        // Should still create in-app notification if enabled
        NotificationPreference::updatePreference(
            $this->user, 
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value, 
            true, // email enabled
            true  // in-app enabled
        );

        $service->send($this->user, NotificationType::PLACEMENT_REQUEST_RESPONSE->value, [
            'message' => 'Test notification 2',
            'link' => '/test2'
        ]);

        $inAppNotification = Notification::where('user_id', $this->user->id)
            ->whereJsonContains('data->channel', 'in_app')
            ->first();

        $this->assertNotNull($inAppNotification);
    }
}