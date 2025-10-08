<?php

namespace App\Services;

use App\Jobs\SendNotificationEmail;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    protected EmailConfigurationService $emailConfigurationService;

    public function __construct(?EmailConfigurationService $emailConfigurationService = null)
    {
        // Allow direct instantiation in tests; fallback to container when not provided
        $this->emailConfigurationService = $emailConfigurationService ?? app(EmailConfigurationService::class);
    }

    /**
     * Send a notification to a user through appropriate channels based on their preferences.
     */
    public function send(User $user, string $type, array $data): void
    {
        $preferences = $this->getUserPreferences($user, $type);

        Log::info('Sending notification', [
            'user_id' => $user->id,
            'type' => $type,
            'email_enabled' => $preferences->email_enabled,
            'in_app_enabled' => $preferences->in_app_enabled,
        ]);

        $emailSent = false;
        $inAppSent = false;

        // Send in-app notification if enabled
        if ($preferences->in_app_enabled) {
            $inAppSent = $this->sendInApp($user, $type, $data);
        }

        // Send email notification if enabled by user preference
        // Don't gate on global email configuration here; the queued job will verify configuration
        if ($preferences->email_enabled) {
            $emailSent = $this->sendEmail($user, $type, $data);
        }

        // Fallback: if email was requested but failed, and in-app wasn't sent, send in-app as fallback
        if ($preferences->email_enabled && ! $emailSent && ! $inAppSent) {
            Log::info('Email notification failed, falling back to in-app notification', [
                'user_id' => $user->id,
                'type' => $type,
            ]);
            $this->sendInAppFallback($user, $type, $data);
        }
    }

    /**
     * Send an email notification to the user.
     *
     * @param  User  $user  The user to send the email to
     * @param  string  $type  The notification type
     * @param  array  $data  The notification data
     * @return bool True if email was successfully queued, false otherwise
     */
    public function sendEmail(User $user, string $type, array $data): bool
    {
        try {
            // Create a notification record for tracking email delivery
            $notification = $this->createNotificationRecord($user, $type, $data, 'email');

            // Queue the email job for asynchronous processing
            SendNotificationEmail::dispatch($user, $type, $data, $notification->id);

            Log::info('Email notification queued', [
                'user_id' => $user->id,
                'notification_id' => $notification->id,
                'type' => $type,
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to queue email notification', [
                'user_id' => $user->id,
                'type' => $type,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return false;
        }
    }

    /**
     * Send an in-app notification to the user.
     *
     * @param  User  $user  The user to send the notification to
     * @param  string  $type  The notification type
     * @param  array  $data  The notification data
     * @return bool True if in-app notification was successfully created, false otherwise
     */
    public function sendInApp(User $user, string $type, array $data): bool
    {
        try {
            $notification = $this->createNotificationRecord($user, $type, $data, 'in_app');

            // Mark as delivered immediately for in-app notifications
            $notification->update(['delivered_at' => now()]);

            Log::info('In-app notification created', [
                'user_id' => $user->id,
                'notification_id' => $notification->id,
                'type' => $type,
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to create in-app notification', [
                'user_id' => $user->id,
                'type' => $type,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return false;
        }
    }

    /**
     * Send an in-app notification as a fallback when email fails.
     *
     * @param  User  $user  The user to send the notification to
     * @param  string  $type  The notification type
     * @param  array  $data  The notification data
     * @return bool True if fallback notification was successfully created, false otherwise
     */
    public function sendInAppFallback(User $user, string $type, array $data): bool
    {
        try {
            // Add fallback indicator to the data
            $fallbackData = array_merge($data, [
                'is_fallback' => true,
                'original_channel' => 'email',
                'fallback_reason' => 'Email delivery failed or not configured',
            ]);

            $notification = $this->createNotificationRecord($user, $type, $fallbackData, 'in_app_fallback');

            // Mark as delivered immediately for in-app notifications
            $notification->update(['delivered_at' => now()]);

            Log::info('Fallback in-app notification created', [
                'user_id' => $user->id,
                'notification_id' => $notification->id,
                'type' => $type,
                'reason' => 'Email notification failed',
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to create fallback in-app notification', [
                'user_id' => $user->id,
                'type' => $type,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return false;
        }
    }

    /**
     * Check if email notifications are properly configured and available.
     *
     * @return array Configuration status with details
     */
    public function getEmailConfigurationStatus(): array
    {
        try {
            $activeConfig = $this->emailConfigurationService->getActiveConfiguration();

            if (! $activeConfig) {
                return [
                    'enabled' => false,
                    'status' => 'no_configuration',
                    'message' => 'No email configuration found',
                ];
            }

            if (! $activeConfig->isValid()) {
                return [
                    'enabled' => false,
                    'status' => 'invalid_configuration',
                    'message' => 'Email configuration is invalid',
                    'errors' => $activeConfig->validateConfig(),
                ];
            }

            // Test connection
            $testResult = $this->emailConfigurationService->testConfigurationWithDetails();

            return [
                'enabled' => $testResult['success'],
                'status' => $testResult['success'] ? 'ready' : 'connection_failed',
                'message' => $testResult['success'] ? 'Email system is ready' : $testResult['error'],
                'provider' => $activeConfig->provider,
                'from_address' => $activeConfig->config['from_address'] ?? 'Not set',
            ];
        } catch (\Exception $e) {
            Log::error('Error checking email configuration status', [
                'error' => $e->getMessage(),
            ]);

            return [
                'enabled' => false,
                'status' => 'error',
                'message' => 'Error checking email configuration: '.$e->getMessage(),
            ];
        }
    }

    private function getUserPreferences(User $user, string $type): NotificationPreference
    {
        return NotificationPreference::getPreference($user, $type);
    }

    /**
     * Create a notification record in the database.
     *
     * @param  User  $user  The user
     * @param  string  $type  The notification type
     * @param  array  $data  The notification data
     * @param  string  $channel  The delivery channel (email or in_app)
     */
    private function createNotificationRecord(User $user, string $type, array $data, string $channel): Notification
    {
        return Notification::create([
            'user_id' => $user->id,
            'type' => $type,
            'message' => $data['message'] ?? '',
            'link' => $data['link'] ?? null,
            'data' => array_merge($data, ['channel' => $channel]),
            'is_read' => false,
        ]);
    }
}
