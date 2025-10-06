<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Settings extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Get a setting value by key with optional default
     */
    public static function get(string $key, $default = null)
    {
        $cacheKey = "settings.{$key}";
        
        return Cache::remember($cacheKey, 3600, function () use ($key, $default) {
            $setting = static::where('key', $key)->first();
            return $setting ? $setting->value : $default;
        });
    }

    /**
     * Set a setting value by key
     */
    public static function set(string $key, $value): void
    {
        static::updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );

        // Clear cache for this setting
        Cache::forget("settings.{$key}");
    }

    /**
     * Toggle a boolean setting
     */
    public static function toggle(string $key): bool
    {
        $currentValue = static::get($key, false);
        $newValue = !filter_var($currentValue, FILTER_VALIDATE_BOOLEAN);
        
        static::set($key, $newValue ? 'true' : 'false');
        
        return $newValue;
    }

    /**
     * Check if invite-only mode is enabled
     */
    public static function isInviteOnlyEnabled(): bool
    {
        return filter_var(static::get('invite_only_enabled', 'false'), FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Enable or disable invite-only mode
     */
    public static function setInviteOnlyEnabled(bool $enabled): void
    {
        static::set('invite_only_enabled', $enabled ? 'true' : 'false');
    }
}
