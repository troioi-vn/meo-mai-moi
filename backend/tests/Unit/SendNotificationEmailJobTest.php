<?php

namespace Tests\Unit;

use App\Enums\NotificationType;
use App\Jobs\SendNotificationEmail;
use App\Mail\HelperResponseAcceptedMail;
use App\Mail\HelperResponseRejectedMail;
use App\Mail\PlacementRequestResponseMail;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SendNotificationEmailJobTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Notification $notification;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email' => 'test@example.com',
        ]);

        $this->notification = Notification::factory()->create([
            'user_id' => $this->user->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'delivered_at' => null,
            'failed_at' => null,
            'failure_reason' => null,
        ]);

        // Mock EmailConfigurationService to return true for isEmailEnabled
        $mockEmailService = $this->createMock(\App\Services\EmailConfigurationService::class);
        $mockEmailService->method('isEmailEnabled')->willReturn(true);
        $this->app->instance(\App\Services\EmailConfigurationService::class, $mockEmailService);
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        \Mockery::close();
    }

    public function test_job_sends_placement_request_response_email()
    {
        Mail::fake();

        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            ['pet_id' => 1],
            $this->notification->id
        );

        $job->handle();

        Mail::assertSent(PlacementRequestResponseMail::class, function ($mail) {
            return $mail->hasTo($this->user->email);
        });

        $this->notification->refresh();
        $this->assertNotNull($this->notification->delivered_at);
        $this->assertNull($this->notification->failed_at);
        $this->assertNull($this->notification->failure_reason);
    }

    public function test_job_can_override_recipient_email_address()
    {
        Mail::fake();

        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            ['pet_id' => 1],
            $this->notification->id,
            'override@example.com'
        );

        $job->handle();

        Mail::assertSent(PlacementRequestResponseMail::class, function ($mail) {
            return $mail->hasTo('override@example.com');
        });
    }

    public function test_job_sends_helper_response_accepted_email()
    {
        Mail::fake();

        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            ['pet_id' => 1],
            $this->notification->id
        );

        $job->handle();

        Mail::assertSent(HelperResponseAcceptedMail::class, function ($mail) {
            return $mail->hasTo($this->user->email);
        });

        $this->notification->refresh();
        $this->assertNotNull($this->notification->delivered_at);
    }

    public function test_job_sends_helper_response_accepted_email_with_full_data()
    {
        Mail::fake();

        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            ['helper_profile_id' => 1],
            $this->notification->id
        );

        $job->handle();

        Mail::assertSent(HelperResponseAcceptedMail::class, function ($mail) {
            return $mail->hasTo($this->user->email);
        });

        $this->notification->refresh();
        $this->assertNotNull($this->notification->delivered_at);
    }

    public function test_job_sends_helper_response_rejected_email()
    {
        Mail::fake();

        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::HELPER_RESPONSE_REJECTED->value,
            ['helper_profile_id' => 1],
            $this->notification->id
        );

        $job->handle();

        Mail::assertSent(HelperResponseRejectedMail::class, function ($mail) {
            return $mail->hasTo($this->user->email);
        });

        $this->notification->refresh();
        $this->assertNotNull($this->notification->delivered_at);
    }

    public function test_job_handles_invalid_notification_type()
    {
        $job = new SendNotificationEmail(
            $this->user,
            'invalid_type',
            [],
            $this->notification->id
        );

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid notification type: invalid_type');

        $job->handle();
    }

    public function test_job_handles_missing_notification()
    {
        Log::shouldReceive('error')->once()->with('Notification not found for email job', [
            'notification_id' => 999,
            'user_id' => $this->user->id,
        ]);

        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            [],
            999 // Non-existent notification ID
        );

        $job->handle();

        // Should not throw exception, just log and return
        $this->assertTrue(true);
    }

    public function test_job_skips_already_delivered_notification()
    {
        Mail::fake();
        Log::shouldReceive('info')->once()->with('Email notification already processed', [
            'notification_id' => $this->notification->id,
            'user_id' => $this->user->id,
            'status' => 'delivered',
        ]);

        // Mark notification as already delivered
        $this->notification->update(['delivered_at' => now()]);

        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            [],
            $this->notification->id
        );

        $job->handle();

        Mail::assertNothingSent();
    }

    public function test_job_skips_already_failed_notification()
    {
        Mail::fake();
        Log::shouldReceive('info')->once()->with('Email notification already processed', [
            'notification_id' => $this->notification->id,
            'user_id' => $this->user->id,
            'status' => 'failed',
        ]);

        // Mark notification as already failed
        $this->notification->update([
            'failed_at' => now(),
            'failure_reason' => 'Previous failure',
        ]);

        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            [],
            $this->notification->id
        );

        $job->handle();

        Mail::assertNothingSent();
    }

    public function test_job_handles_mail_sending_failure()
    {
        Mail::shouldReceive('to')->andReturnSelf();
        Mail::shouldReceive('send')->andThrow(new \Exception('SMTP connection failed'));

        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            [],
            $this->notification->id
        );

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('SMTP connection failed');

        $job->handle();
    }

    public function test_failed_method_updates_notification_with_failure_details()
    {
        // Set user preferences: email enabled, in-app disabled (so fallback will be created)
        \App\Models\NotificationPreference::updatePreference(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            true,  // email enabled
            false  // in-app disabled
        );

        $exception = new \Exception('Email delivery failed');

        Log::shouldReceive('error')->once()->with('Email notification job failed permanently', \Mockery::on(function ($context) {
            return $context['notification_id'] === $this->notification->id &&
                   $context['user_id'] === $this->user->id &&
                   $context['user_email'] === $this->user->email &&
                   $context['type'] === NotificationType::PLACEMENT_REQUEST_RESPONSE->value &&
                   $context['error'] === 'Email delivery failed';
        }));

        // Mock the fallback notification creation log
        Log::shouldReceive('info')->once()->with('Created fallback in-app notification for failed email', \Mockery::any());

        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            [],
            $this->notification->id
        );

        Notification::withoutEvents(function () use ($job, $exception) {
            $job->failed($exception);
        });

        $this->notification->refresh();
        $this->assertNotNull($this->notification->failed_at);
        $this->assertEquals('Email delivery failed', $this->notification->failure_reason);
        $this->assertNull($this->notification->delivered_at);
    }

    public function test_failed_method_truncates_long_failure_reason()
    {
        $longMessage = str_repeat('A', 600); // Longer than 500 chars
        $exception = new \Exception($longMessage);

        Log::shouldReceive('error')->once();
        Log::shouldReceive('info')->once(); // For fallback notification

        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            [],
            $this->notification->id
        );

        $job->failed($exception);

        $this->notification->refresh();
        $this->assertEquals(500, strlen($this->notification->failure_reason));
        $this->assertStringEndsWith('...', $this->notification->failure_reason);
    }

    public function test_failed_method_handles_missing_notification()
    {
        $exception = new \Exception('Test failure');

        Log::shouldReceive('error')->once();
        Log::shouldReceive('error')->once(); // For fallback creation failure

        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            [],
            999 // Non-existent notification ID
        );

        // Should not throw exception when notification is missing
        $job->failed($exception);

        $this->assertTrue(true);
    }

    public function test_job_logs_successful_email_sending()
    {
        Mail::fake();

        Log::shouldReceive('info')->once()->with('Email notification sent successfully', [
            'notification_id' => $this->notification->id,
            'user_id' => $this->user->id,
            'user_email' => $this->user->email,
            'recipient_email' => $this->user->email,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
        ]);

        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            [],
            $this->notification->id
        );

        $job->handle();
    }

    public function test_job_has_correct_retry_configuration()
    {
        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            [],
            $this->notification->id
        );

        $this->assertEquals(3, $job->tries());
        $this->assertEquals([60, 300, 900], $job->backoff());
    }

    public function test_job_clears_previous_failure_on_successful_delivery()
    {
        Mail::fake();

        // Set up notification with previous failure but not marked as failed (so it can be retried)
        $this->notification->update([
            'failure_reason' => 'Previous failure',
        ]);

        $job = new SendNotificationEmail(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            [],
            $this->notification->id
        );

        $job->handle();

        $this->notification->refresh();
        $this->assertNotNull($this->notification->delivered_at);
        $this->assertNull($this->notification->failed_at);
        $this->assertNull($this->notification->failure_reason);
    }
}
