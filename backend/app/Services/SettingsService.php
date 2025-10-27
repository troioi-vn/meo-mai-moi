<?php

namespace App\Services;

use App\Models\Settings;
use Illuminate\Support\Facades\Cache;

class SettingsService
{
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

    /**
     * Get public settings that can be exposed to frontend
     */
    public function getPublicSettings(): array
    {
        return [
            'invite_only_enabled' => $this->isInviteOnlyEnabled(),
            'email_verification_required' => $this->isEmailVerificationRequired(),
        ];
    }

    /**
     * Clear all settings cache (delegates to Settings model)
     */
    public function clearCache(): void
    {
        $keys = ['invite_only_enabled', 'email_verification_required'];

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
}
