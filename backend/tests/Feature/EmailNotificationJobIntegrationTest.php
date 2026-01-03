<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Jobs\SendNotificationEmail;
use App\Models\HelperProfile;
use App\Models\Notification;
use App\Models\Pet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class EmailNotificationJobIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Pet $pet;

    protected HelperProfile $helperProfile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email' => 'test@example.com',
        ]);

        $this->pet = Pet::factory()->create([
            'created_by' => $this->user->id,
            'status' => \App\Enums\PetStatus::ACTIVE,
        ]);

        // Mock EmailConfigurationService to return true for isEmailEnabled
        $mockEmailService = $this->createMock(\App\Services\EmailConfigurationService::class);
        $mockEmailService->method('isEmailEnabled')->willReturn(true);
        $this->app->instance(\App\Services\EmailConfigurationService::class, $mockEmailService);

        $this->helperProfile = HelperProfile::factory()->create([
            'user_id' => $this->user->id,
        ]);
    }

    public function test_email_notification_job_can_be_queued_and_processed()
    {
        Queue::fake();
        Mail::fake();

        $notification = Notification::factory()->create([
            'user_id' => $this->user->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
        ]);

        // Dispatch the job
        SendNotificationEmail::dispatch(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            ['pet_id' => $this->pet->id],
            $notification->id
        );

        // Assert job was queued
        Queue::assertPushed(SendNotificationEmail::class, function ($job) use ($notification) {
            return $job->user->id === $this->user->id &&
                   $job->type === NotificationType::PLACEMENT_REQUEST_RESPONSE->value &&
                   $job->notificationId === $notification->id;
        });
    }

    public function test_email_notification_job_processes_with_real_queue()
    {
        Mail::fake();

        $notification = Notification::factory()->create([
            'user_id' => $this->user->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'delivered_at' => null,
            'failed_at' => null,
        ]);

        // Create and process the job directly (simulating queue processing)
        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            ['pet_id' => $this->pet->id],
            $notification->id
        );

        $job->handle();

        // Verify notification was marked as delivered
        $notification->refresh();
        $this->assertNotNull($notification->delivered_at);
        $this->assertNull($notification->failed_at);
        $this->assertNull($notification->failure_reason);
        $this->assertEquals('delivered', $notification->delivery_status);
    }

    public function test_email_notification_job_handles_queue_failure_gracefully()
    {
        $notification = Notification::factory()->create([
            'user_id' => $this->user->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'delivered_at' => null,
            'failed_at' => null,
        ]);

        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            ['pet_id' => $this->pet->id],
            $notification->id
        );

        // Simulate job failure
        $exception = new \Exception('Queue processing failed');
        $job->failed($exception);

        // Verify notification was marked as failed
        $notification->refresh();
        $this->assertNotNull($notification->failed_at);
        $this->assertEquals('Queue processing failed', $notification->failure_reason);
        $this->assertNull($notification->delivered_at);
        $this->assertEquals('failed', $notification->delivery_status);
    }

    public function test_email_notification_job_respects_retry_configuration()
    {
        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            [],
            1
        );

        // Verify retry configuration
        $this->assertEquals(3, $job->tries);
        $this->assertEquals([60, 300, 900], $job->backoff());
    }

    public function test_email_notification_job_with_all_notification_types()
    {
        Mail::fake();

        $notificationTypes = [
            NotificationType::PLACEMENT_REQUEST_RESPONSE,
            NotificationType::HELPER_RESPONSE_ACCEPTED,
            NotificationType::HELPER_RESPONSE_REJECTED,
            NotificationType::HELPER_RESPONSE_CANCELED,
        ];

        foreach ($notificationTypes as $type) {
            $notification = Notification::factory()->create([
                'user_id' => $this->user->id,
                'type' => $type->value,
                'delivered_at' => null,
                'failed_at' => null,
            ]);

            $job = new SendNotificationEmail(
                $this->user,
                $type->value,
                [
                    'pet_id' => $this->pet->id,
                    'helper_profile_id' => $this->helperProfile->id,
                ],
                $notification->id
            );

            $job->handle();

            // Verify each notification was processed successfully
            $notification->refresh();
            $this->assertNotNull($notification->delivered_at, "Failed for type: {$type->value}");
            $this->assertNull($notification->failed_at, "Failed for type: {$type->value}");
        }
    }

    public function test_email_notification_job_handles_concurrent_processing()
    {
        Mail::fake();

        $notification = Notification::factory()->create([
            'user_id' => $this->user->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'delivered_at' => null,
            'failed_at' => null,
        ]);

        // Simulate first job processing the notification
        $job1 = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            ['pet_id' => $this->pet->id],
            $notification->id
        );

        $job1->handle();

        // Simulate second job trying to process the same notification
        $job2 = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            ['pet_id' => $this->pet->id],
            $notification->id
        );

        $job2->handle();

        // Verify notification was only processed once
        $notification->refresh();
        $this->assertNotNull($notification->delivered_at);
        $this->assertNull($notification->failed_at);

        // Mail should only be sent once (from first job)
        Mail::assertSentCount(1);
    }
}
