<?php

namespace App\Services;

use App\Models\Settings;
use Illuminate\Support\Facades\Cache;

class SettingsService
{
    private const CACHE_TTL = 3600; // 1 hour
    private const CACHE_PREFIX = 'settings.';

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
     * Toggle invite-only mode and return new state
     */
    public function toggleInviteOnly(): bool
    {
        $currentValue = $this->isInviteOnlyEnabled();
        $newValue = !$currentValue;
        
        $this->setCachedSetting('invite_only_enabled', $newValue ? 'true' : 'false');
        
        return $newValue;
    }

    /**
     * Set invite-only mode state
     */
    public function setInviteOnlyEnabled(bool $enabled): void
    {
        $this->setCachedSetting('invite_only_enabled', $enabled ? 'true' : 'false');
    }

    /**
     * Get public settings that can be exposed to frontend
     */
    public function getPublicSettings(): array
    {
        return [
            'invite_only_enabled' => $this->isInviteOnlyEnabled(),
        ];
    }

    /**
     * Get a setting value with caching
     */
    private function getCachedSetting(string $key, $default = null)
    {
        $cacheKey = self::CACHE_PREFIX . $key;
        
        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($key, $default) {
            return Settings::get($key, $default);
        });
    }

    /**
     * Set a setting value and update cache
     */
    private function setCachedSetting(string $key, $value): void
    {
        Settings::set($key, $value);
        
        // Update cache immediately
        $cacheKey = self::CACHE_PREFIX . $key;
        Cache::put($cacheKey, $value, self::CACHE_TTL);
    }

    /**
     * Clear all settings cache
     */
    public function clearCache(): void
    {
        $keys = ['invite_only_enabled'];
        
        foreach ($keys as $key) {
            Cache::forget(self::CACHE_PREFIX . $key);
        }
    }
}
