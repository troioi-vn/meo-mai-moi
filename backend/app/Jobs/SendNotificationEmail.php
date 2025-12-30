<?php

namespace App\Jobs;

use App\Enums\NotificationType;
use App\Mail\EmailVerificationMail;
use App\Mail\HelperResponseAcceptedMail;
use App\Mail\HelperResponseRejectedMail;
use App\Mail\NewMessageMail;
use App\Mail\PetBirthdayMail;
use App\Mail\PlacementRequestAcceptedMail;
use App\Mail\PlacementRequestResponseMail;
use App\Mail\VaccinationReminderMail;
use App\Models\EmailLog;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendNotificationEmail implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    // Laravel uses the public $tries property to determine max attempts. Keep public.
    public int $tries = 3;

    // Replace public $backoff property with method to avoid forbidden public property rule.
    // 1 min, 5 min, 15 min
    protected array $backoffSchedule = [60, 300, 900];

    private ?EmailLog $emailLog = null;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public User $user,
        public string $type,
        public array $data,
        public int $notificationId
    ) {
        // NOTE: These are public for legacy tests that introspect queued job properties
    }

    /**
     * Backoff schedule accessor used by the queue worker.
     */
    public function backoff(): array
    {
        return $this->backoffSchedule;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $notification = Notification::find($this->notificationId);

        if (! $notification) {
            Log::error('Notification not found for email job', [
                'notification_id' => $this->notificationId,
                'user_id' => $this->user->id,
            ]);

            return;
        }

        // Check if notification already delivered or failed
        if ($notification->delivered_at || $notification->failed_at) {
            Log::info('Email notification already processed', [
                'notification_id' => $this->notificationId,
                'user_id' => $this->user->id,
                'status' => $notification->delivery_status,
            ]);

            return;
        }

        try {
            // Get the notification type enum
            $notificationType = NotificationType::tryFrom($this->type);

            if (! $notificationType) {
                throw new \InvalidArgumentException("Invalid notification type: {$this->type}");
            }

            // Create the appropriate mail class
            $mail = $this->createMailClass($notificationType);

            if (! $mail) {
                throw new \InvalidArgumentException("No mail class found for notification type: {$this->type}");
            }

            // Validate user email
            if (! isset($this->user->email) || $this->user->email === '' || ! filter_var($this->user->email, FILTER_VALIDATE_EMAIL)) {
                throw new \InvalidArgumentException('Invalid user email address: '.($this->user->email ?? 'empty'));
            }

            // Validate email configuration before logging/sending, but allow sending without an active record
            $emailService = app(\App\Services\EmailConfigurationService::class);
            if (! $emailService->isEmailEnabled()) {
                // Gracefully skip sending when email isn't configured in any environment
                Log::warning('Email system not configured; skipping send', [
                    'notification_id' => $this->notificationId,
                    'user_id' => $this->user->id,
                    'type' => $this->type,
                    'env' => app()->environment(),
                ]);

                // Optionally create an EmailLog entry to surface in the admin panel
                try {
                    $this->emailLog = \App\Models\EmailLog::create([
                        'user_id' => $this->user->id,
                        'notification_id' => $this->notificationId,
                        'email_configuration_id' => null,
                        'recipient_email' => $this->user->email,
                        'subject' => method_exists($mail, 'envelope') ? ($mail->envelope()->subject ?? 'Notification Email') : 'Notification Email',
                        'body' => $this->extractEmailBody($mail),
                        'status' => 'failed',
                        'error_message' => 'Email not configured',
                        'failed_at' => now(),
                    ]);
                } catch (\Throwable $logErr) {
                    Log::warning('Failed to create EmailLog for not-configured email', [
                        'notification_id' => $this->notificationId,
                        'user_id' => $this->user->id,
                        'error' => $logErr->getMessage(),
                    ]);
                }

                // Mark notification as failed and create a fallback in-app notification
                $notification->update([
                    'failed_at' => now(),
                    'failure_reason' => 'Email not configured',
                    'delivered_at' => null,
                ]);

                $this->createFallbackNotification(new \RuntimeException('Email not configured'));

                return;
            }
            $activeConfig = $emailService->getActiveConfiguration();
            $activeConfigId = $activeConfig?->id; // may be null in tests

            // Create EmailLog entry
            $this->emailLog = EmailLog::create([
                'user_id' => $this->user->id,
                'notification_id' => $this->notificationId,
                'email_configuration_id' => $activeConfigId,
                'recipient_email' => $this->user->email,
                'subject' => $mail->envelope()->subject ?? 'Notification Email',
                'body' => $this->extractEmailBody($mail),
                'status' => 'pending',
            ]);

            // Attach correlation metadata for Mailgun webhooks
            try {
                $emailLogId = $this->emailLog->id;
                $notificationId = $this->notificationId;
                $mail->withSymfonyMessage(function ($message) use ($emailLogId, $notificationId) {
                    $headers = $message->getHeaders();
                    $variables = json_encode([
                        'email_log_id' => $emailLogId,
                        'notification_id' => $notificationId,
                    ]);
                    // Mailgun recognizes this header and echoes it back in webhooks
                    $headers->addTextHeader('X-Mailgun-Variables', $variables);
                });
            } catch (\Throwable $e) {
                Log::warning('Failed to attach Mailgun variables to email', [
                    'email_log_id' => $this->emailLog->id,
                    'error' => $e->getMessage(),
                ]);
            }

            // Send the email
            Mail::to($this->user->email)->send($mail);

            // Mark email as accepted in log (Mailgun accepted for delivery)
            $this->emailLog->markAsAccepted('Email accepted by mail system');

            // Update notification with delivery timestamp
            $notification->update([
                'delivered_at' => now(),
                'failed_at' => null,
                'failure_reason' => null,
            ]);

            Log::info('Email notification sent successfully', [
                'notification_id' => $this->notificationId,
                'user_id' => $this->user->id,
                'user_email' => $this->user->email,
                'type' => $this->type,
            ]);
        } catch (\Exception $e) {
            // Mark email as failed in log if it was created
            if ($this->emailLog) {
                $this->emailLog->markAsFailed($e->getMessage());
            }

            // Log the error with context
            Log::error('Email notification job failed during execution', [
                'notification_id' => $this->notificationId,
                'email_log_id' => $this->emailLog?->id,
                'user_id' => $this->user->id,
                'user_email' => $this->user->email,
                'type' => $this->type,
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
            ]);

            // Let the failed() method handle the failure
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        $notification = Notification::find($this->notificationId);

        if ($notification) {
            $notification->update([
                'failed_at' => now(),
                'failure_reason' => $this->truncateFailureReason($exception->getMessage()),
                'delivered_at' => null,
            ]);
        }

        // Mark email log as failed if it exists
        if ($this->emailLog && $this->emailLog->status !== 'failed') {
            $this->emailLog->markAsFailed('Job failed permanently after '.$this->tries.' attempts: '.$exception->getMessage());
        }

        Log::error('Email notification job failed permanently', [
            'notification_id' => $this->notificationId,
            'email_log_id' => $this->emailLog?->id,
            'user_id' => $this->user->id,
            'user_email' => $this->user->email,
            'type' => $this->type,
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts(),
        ]);

        // Implement fallback to in-app notification
        $this->createFallbackNotification($exception);
    }

    /**
     * Create the appropriate mail class for the notification type.
     */
    private function createMailClass(NotificationType $notificationType)
    {
        return match ($notificationType) {
            NotificationType::PLACEMENT_REQUEST_RESPONSE => new PlacementRequestResponseMail($this->user, $notificationType, $this->data),
            NotificationType::PLACEMENT_REQUEST_ACCEPTED => new PlacementRequestAcceptedMail($this->user, $notificationType, $this->data),
            NotificationType::HELPER_RESPONSE_ACCEPTED => new HelperResponseAcceptedMail($this->user, $notificationType, $this->data),
            NotificationType::HELPER_RESPONSE_REJECTED => new HelperResponseRejectedMail($this->user, $notificationType, $this->data),
            NotificationType::VACCINATION_REMINDER => new VaccinationReminderMail($this->user, $notificationType, $this->data),
            NotificationType::PET_BIRTHDAY => new PetBirthdayMail($this->user, $notificationType, $this->data),
            NotificationType::EMAIL_VERIFICATION => new EmailVerificationMail($this->user, $notificationType, $this->data),
            NotificationType::NEW_MESSAGE => new NewMessageMail($this->user, $notificationType, $this->data),
            default => null,
        };
    }

    /**
     * Extract email body content for logging.
     */
    private function extractEmailBody($mail): string
    {
        try {
            // For verification emails, provide a readable summary with the link
            if ($this->type === NotificationType::EMAIL_VERIFICATION->value) {
                $link = $this->data['verificationUrl'] ?? ($mail->verificationUrl ?? null);
                $userName = $this->user->name ?? 'there';
                $appName = config('app.name');

                if ($link) {
                    return "Hi {$userName},\n\nThanks for registering with {$appName}. Please confirm your email address by clicking the link below:\n\n{$link}\n\nThis link will expire in 60 minutes for your security.\n\nThanks,\nThe {$appName} Team";
                }

                return 'Email verification - link unavailable';
            }

            // For other email types, try to render as HTML
            if (method_exists($mail, 'render')) {
                return (string) $mail->render();
            }

            return 'Email content (notification type: '.$this->type.')';
        } catch (\Exception $e) {
            return 'Email body could not be extracted: '.$e->getMessage();
        }
    }

    /**
     * Create a fallback in-app notification when email fails.
     */
    private function createFallbackNotification(\Throwable $exception): void
    {
        try {
            // Check if user has in-app notifications enabled for this type
            $preferences = \App\Models\NotificationPreference::getPreference($this->user, $this->type);

            // Only create fallback if user doesn't already have in-app enabled
            // (to avoid duplicate notifications)
            if (! $preferences->in_app_enabled) {
                // Create fallback in-app notification
                $fallbackData = array_merge($this->data, [
                    'is_fallback' => true,
                    'original_channel' => 'email',
                    'fallback_reason' => 'Email delivery failed after '.$this->tries.' attempts',
                    'original_error' => $this->truncateFailureReason($exception->getMessage()),
                ]);

                $fallbackNotification = \App\Models\Notification::create([
                    'user_id' => $this->user->id,
                    'type' => $this->type,
                    'message' => $this->data['message'] ?? '',
                    'link' => $this->data['link'] ?? null,
                    'data' => array_merge($fallbackData, ['channel' => 'in_app_fallback']),

                    'delivered_at' => now(), // Mark as delivered immediately for in-app
                ]);

                Log::info('Created fallback in-app notification for failed email', [
                    'original_notification_id' => $this->notificationId,
                    'fallback_notification_id' => $fallbackNotification->id,
                    'user_id' => $this->user->id,
                    'type' => $this->type,
                ]);
            } else {
                Log::info('Skipped fallback notification - user already has in-app enabled', [
                    'notification_id' => $this->notificationId,
                    'user_id' => $this->user->id,
                    'type' => $this->type,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to create fallback notification', [
                'original_notification_id' => $this->notificationId,
                'user_id' => $this->user->id,
                'type' => $this->type,
                'fallback_error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Truncate failure reason to fit database field constraints.
     */
    private function truncateFailureReason(string $reason): string
    {
        // Assuming failure_reason field has a reasonable length limit (e.g., 500 chars)
        return strlen($reason) > 500 ? substr($reason, 0, 497).'...' : $reason;
    }
}
