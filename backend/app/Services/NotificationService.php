<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\NotificationPreference;
use App\Models\User;
use App\Services\Notifications\EmailConfigurationStatusBuilder;
use App\Services\Notifications\EmailNotificationChannel;
use App\Services\Notifications\InAppNotificationChannel;
use App\Services\Notifications\TelegramNotificationChannel;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    private EmailNotificationChannel $emailChannel;

    private InAppNotificationChannel $inAppChannel;

    private InAppNotificationChannel $fallbackChannel;

    private TelegramNotificationChannel $telegramChannel;

    private EmailConfigurationStatusBuilder $configStatusBuilder;

    public function __construct(
        ?EmailConfigurationService $emailConfigurationService = null,
        ?EmailNotificationChannel $emailChannel = null,
        ?InAppNotificationChannel $inAppChannel = null,
        ?TelegramNotificationChannel $telegramChannel = null
    ) {
        $emailConfigService = $emailConfigurationService ?? app(EmailConfigurationService::class);

        $this->emailChannel = $emailChannel ?? new EmailNotificationChannel;
        $this->inAppChannel = $inAppChannel ?? new InAppNotificationChannel;
        $this->fallbackChannel = new InAppNotificationChannel(true);
        $this->telegramChannel = $telegramChannel ?? new TelegramNotificationChannel;
        $this->configStatusBuilder = new EmailConfigurationStatusBuilder($emailConfigService);
    }

    /**
     * Send a notification to a user through appropriate channels based on their preferences.
     */
    public function send(User $user, string $type, array $data): void
    {
        $preferences = $this->getUserPreferences($user, $type);

        $this->logNotificationAttempt($user, $type, $preferences);

        $emailSent = $this->sendEmailIfEnabled($user, $type, $data, $preferences);
        $inAppSent = $this->sendInAppIfEnabled($user, $type, $data, $preferences);
        $this->sendTelegramIfEnabled($user, $type, $data, $preferences);

        $this->handleFallbackIfNeeded($user, $type, $data, $preferences, $emailSent, $inAppSent);
    }

    /**
     * Send an email notification to the user.
     */
    public function sendEmail(User $user, string $type, array $data): bool
    {
        return $this->emailChannel->send($user, $type, $data);
    }

    /**
     * Send an in-app notification to the user.
     */
    public function sendInApp(User $user, string $type, array $data): bool
    {
        return $this->inAppChannel->send($user, $type, $data);
    }

    /**
     * Send a Telegram notification to the user.
     */
    public function sendTelegram(User $user, string $type, array $data): bool
    {
        return $this->telegramChannel->send($user, $type, $data);
    }

    /**
     * Send an in-app notification as a fallback when email fails.
     */
    public function sendInAppFallback(User $user, string $type, array $data): bool
    {
        return $this->fallbackChannel->send($user, $type, $data);
    }

    /**
     * Check if email notifications are properly configured and available.
     */
    public function getEmailConfigurationStatus(): array
    {
        return $this->configStatusBuilder->getStatus();
    }

    private function sendEmailIfEnabled(User $user, string $type, array $data, $preferences): bool
    {
        return $preferences->email_enabled ? $this->emailChannel->send($user, $type, $data) : false;
    }

    private function sendInAppIfEnabled(User $user, string $type, array $data, $preferences): bool
    {
        return $preferences->in_app_enabled ? $this->inAppChannel->send($user, $type, $data) : false;
    }

    private function sendTelegramIfEnabled(User $user, string $type, array $data, $preferences): bool
    {
        if (! $preferences->telegram_enabled) {
            Log::debug('Skipping Telegram notification because preference is disabled', [
                'user_id' => $user->id,
                'type' => $type,
            ]);

            return false;
        }

        Log::debug('Attempting Telegram notification send', [
            'user_id' => $user->id,
            'type' => $type,
            'payload_keys' => array_keys($data),
        ]);

        $telegramSent = $this->telegramChannel->send($user, $type, $data);

        Log::debug('Telegram notification send finished', [
            'user_id' => $user->id,
            'type' => $type,
            'sent' => $telegramSent,
        ]);

        return $telegramSent;
    }

    private function handleFallbackIfNeeded(User $user, string $type, array $data, $preferences, bool $emailSent, bool $inAppSent): void
    {
        if ($preferences->email_enabled && ! $emailSent && ! $inAppSent) {
            $this->logFallbackAttempt($user, $type);
            $this->fallbackChannel->send($user, $type, $data);
        }
    }

    private function logNotificationAttempt(User $user, string $type, $preferences): void
    {
        Log::info('Sending notification', [
            'user_id' => $user->id,
            'type' => $type,
            'email_enabled' => $preferences->email_enabled,
            'in_app_enabled' => $preferences->in_app_enabled,
            'telegram_enabled' => $preferences->telegram_enabled,
        ]);
    }

    private function logFallbackAttempt(User $user, string $type): void
    {
        Log::info('Email notification failed, falling back to in-app notification', [
            'user_id' => $user->id,
            'type' => $type,
        ]);
    }

    private function getUserPreferences(User $user, string $type): NotificationPreference
    {
        return NotificationPreference::getPreference($user, $type);
    }
}
