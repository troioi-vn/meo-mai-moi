<?php

namespace App\Services;

use App\Models\User;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Jobs\SendNotificationEmail;
use App\Services\EmailConfigurationService;
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

    $inAppSent = false;

        // In-app channel
        if ($preferences->in_app_enabled) {
            $inAppSent = $this->sendInApp($user, $type, $data);
        }

        // Email channel (do not gate on configuration here; the job will handle failures/fallback)
        if ($preferences->email_enabled) {
            $this->sendEmail($user, $type, $data);
        }
    }

    /**
     * Queue an email notification and create its record.
     * Returns true if job queued successfully.
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
            ]);
            return false;
        }
    }

    /**
     * Create an in-app notification record and mark delivered immediately.
     */
    public function sendInApp(User $user, string $type, array $data): bool
    {
        try {
            $notification = $this->createNotificationRecord($user, $type, $data, 'in_app');
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
            ]);
            return false;
        }
    }

    private function getUserPreferences(User $user, string $type): NotificationPreference
    {
        return NotificationPreference::getPreference($user, $type);
    }

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

    /**
     * Fallback delivery when email was requested but cannot be sent and no in-app was created.
     */
    private function sendInAppFallback(User $user, string $type, array $data): void
    {
        $fallbackData = array_merge($data, [
            'is_fallback' => true,
            'original_channel' => 'email',
        ]);
        $notification = $this->createNotificationRecord($user, $type, $fallbackData, 'in_app_fallback');
        $notification->update(['delivered_at' => now()]);
    }

    /**
     * Provide high-level email configuration status for diagnostics/UI.
     */
    public function getEmailConfigurationStatus(): array
    {
        try {
            $activeConfig = $this->emailConfigurationService->getActiveConfiguration();
            if (!$activeConfig) {
                return [
                    'enabled' => false,
                    'status' => 'no_configuration',
                    'message' => 'No email configuration found',
                ];
            }

            if (!$activeConfig->isValid()) {
                return [
                    'enabled' => false,
                    'status' => 'invalid_configuration',
                    'message' => 'Email configuration is invalid',
                    'errors' => $activeConfig->validateConfig(),
                ];
            }

            $testResult = $this->emailConfigurationService->testConfigurationWithDetails();
            return [
                'enabled' => $testResult['success'] ?? false,
                'status' => ($testResult['success'] ?? false) ? 'ready' : ($testResult['error_type'] ?? 'connection_failed'),
                'message' => $testResult['success'] ? 'Email system is ready' : ($testResult['error'] ?? 'Email configuration test failed'),
                'provider' => $activeConfig->provider,
                'from_address' => $activeConfig->config['from_address'] ?? 'Not set',
            ];
        } catch (\Throwable $e) {
            Log::error('Error checking email configuration status', [
                'error' => $e->getMessage(),
            ]);
            return [
                'enabled' => false,
                'status' => 'error',
                'message' => 'Error checking email configuration: ' . $e->getMessage(),
            ];
        }
    }
}
