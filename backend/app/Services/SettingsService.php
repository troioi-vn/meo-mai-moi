<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Settings;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class SettingsService
{
    private const DEFAULT_STORAGE_LIMIT_MB = 50;

    private const PREMIUM_STORAGE_LIMIT_MB = 5120;

    private const DEFAULT_REGULAR_DAILY_API_QUOTA = 1000;

    private const DEFAULT_API_REQUEST_LOG_RETENTION_DAYS = 30;

    /**
     * Check if invite-only mode is enabled
     */
    public function isInviteOnlyEnabled(): bool
    {
        return filter_var(
            $this->getCachedSetting('invite_only_enabled', 'false'),
            FILTER_VALIDATE_BOOLEAN
        );
    }

    /**
     * Check if email verification is required
     */
    public function isEmailVerificationRequired(): bool
    {
        return filter_var(
            $this->getCachedSetting('email_verification_required', 'true'),
            FILTER_VALIDATE_BOOLEAN
        );
    }

    /**
     * Toggle invite-only mode and return new state
     */
    public function toggleInviteOnly(): bool
    {
        $currentValue = $this->isInviteOnlyEnabled();
        $newValue = ! $currentValue;

        $this->updateCachedSetting('invite_only_enabled', $newValue ? 'true' : 'false');

        return $newValue;
    }

    /**
     * Enable or disable invite-only mode
     */
    public function configureInviteOnlyMode(bool $enabled): void
    {
        $this->updateCachedSetting('invite_only_enabled', $enabled ? 'true' : 'false');
    }

    /**
     * Enable or disable email verification requirement
     */
    public function configureEmailVerificationRequirement(bool $required): void
    {
        $this->updateCachedSetting('email_verification_required', $required ? 'true' : 'false');
    }

    public function getDefaultStorageLimitMb(): int
    {
        return $this->getPositiveIntegerSetting(
            'storage_limit_default_mb',
            self::DEFAULT_STORAGE_LIMIT_MB
        );
    }

    public function getPremiumStorageLimitMb(): int
    {
        return $this->getPositiveIntegerSetting(
            'storage_limit_premium_mb',
            self::PREMIUM_STORAGE_LIMIT_MB
        );
    }

    public function configureDefaultStorageLimitMb(int $megabytes): void
    {
        $this->updateCachedSetting('storage_limit_default_mb', (string) max(1, $megabytes));
    }

    public function configurePremiumStorageLimitMb(int $megabytes): void
    {
        $this->updateCachedSetting('storage_limit_premium_mb', (string) max(1, $megabytes));
    }

    public function getStorageLimitBytesForUser(User $user): int
    {
        $limitMb = $user->hasRole('premium')
            ? $this->getPremiumStorageLimitMb()
            : $this->getDefaultStorageLimitMb();

        $bytes = $limitMb * 1024 * 1024;

        return max(0, $bytes);
    }

    public function getRegularDailyApiQuota(): int
    {
        $configuredDefault = (int) config('api.daily_quota.regular', self::DEFAULT_REGULAR_DAILY_API_QUOTA);

        return $this->getPositiveIntegerSetting(
            'api_daily_quota_regular',
            max(1, $configuredDefault)
        );
    }

    public function configureRegularDailyApiQuota(int $requestsPerDay): void
    {
        $this->updateCachedSetting('api_daily_quota_regular', (string) max(1, $requestsPerDay));
    }

    public function getApiRequestLogsRetentionDays(): int
    {
        $configuredDefault = (int) config('api.request_logs.retention_days', self::DEFAULT_API_REQUEST_LOG_RETENTION_DAYS);

        return $this->getPositiveIntegerSetting(
            'api_request_logs_retention_days',
            max(1, $configuredDefault)
        );
    }

    public function configureApiRequestLogsRetentionDays(int $days): void
    {
        $this->updateCachedSetting('api_request_logs_retention_days', (string) max(1, $days));
    }

    /**
     * Get public settings that can be exposed to frontend
     */
    public function getPublicSettings(): array
    {
        return [
            'invite_only_enabled' => $this->isInviteOnlyEnabled(),
            'email_verification_required' => $this->isEmailVerificationRequired(),
            'telegram_bot_username' => $this->getTelegramBotUsername(),
        ];
    }

    public function getTelegramBotUsername(): ?string
    {
        $botUsername = config('telegram.user_bot.username');

        if (! is_string($botUsername)) {
            return null;
        }

        $normalized = trim($botUsername);

        return $normalized !== '' ? ltrim($normalized, '@') : null;
    }

    /**
     * Clear all settings cache (delegates to Settings model)
     */
    public function clearCache(): void
    {
        $keys = [
            'invite_only_enabled',
            'email_verification_required',
            'storage_limit_default_mb',
            'storage_limit_premium_mb',
            'api_daily_quota_regular',
            'api_request_logs_retention_days',
        ];

        foreach ($keys as $key) {
            Cache::forget("settings.{$key}");
        }
    }

    /**
     * Get a setting value (Settings model handles caching)
     */
    private function getCachedSetting(string $key, $default = null)
    {
        return Settings::get($key, $default);
    }

    /**
     * Update a setting value (Settings model handles cache clearing)
     */
    private function updateCachedSetting(string $key, $value): void
    {
        Settings::set($key, $value);
    }

    private function getPositiveIntegerSetting(string $key, int $default): int
    {
        $rawValue = $this->getCachedSetting($key, (string) $default);
        $normalized = filter_var($rawValue, FILTER_VALIDATE_INT);

        if ($normalized === false || $normalized < 1) {
            return $default;
        }

        return (int) $normalized;
    }
}
