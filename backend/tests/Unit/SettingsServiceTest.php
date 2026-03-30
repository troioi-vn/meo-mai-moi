<?php

namespace Tests\Unit;

use App\Models\Settings;
use App\Models\User;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SettingsServiceTest extends TestCase
{
    use RefreshDatabase;

    private SettingsService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new SettingsService;
        Cache::flush(); // Clear cache before each test
    }

    public function test_is_invite_only_enabled_returns_false_by_default()
    {
        $result = $this->service->isInviteOnlyEnabled();

        $this->assertFalse($result);
    }

    public function test_is_invite_only_enabled_returns_true_when_enabled()
    {
        Settings::set('invite_only_enabled', 'true');

        $result = $this->service->isInviteOnlyEnabled();

        $this->assertTrue($result);
    }

    public function test_set_invite_only_enabled_stores_setting()
    {
        $this->service->configureInviteOnlyMode(true);

        $this->assertTrue($this->service->isInviteOnlyEnabled());
        $this->assertDatabaseHas('settings', [
            'key' => 'invite_only_enabled',
            'value' => 'true',
        ]);
    }

    public function test_set_invite_only_enabled_can_disable()
    {
        $this->service->configureInviteOnlyMode(true);
        $this->service->configureInviteOnlyMode(false);

        $this->assertFalse($this->service->isInviteOnlyEnabled());
        $this->assertDatabaseHas('settings', [
            'key' => 'invite_only_enabled',
            'value' => 'false',
        ]);
    }

    public function test_toggle_invite_only_changes_state()
    {
        $this->assertFalse($this->service->isInviteOnlyEnabled());

        $result = $this->service->toggleInviteOnly();

        $this->assertTrue($result);
        $this->assertTrue($this->service->isInviteOnlyEnabled());
    }

    public function test_toggle_invite_only_changes_state_back()
    {
        $this->service->configureInviteOnlyMode(true);

        $result = $this->service->toggleInviteOnly();

        $this->assertFalse($result);
        $this->assertFalse($this->service->isInviteOnlyEnabled());
    }

    public function test_get_public_settings_returns_correct_structure()
    {
        Config::set('telegram.user_bot.username', null);
        $this->service->configureInviteOnlyMode(true);

        $settings = $this->service->getPublicSettings();

        $this->assertEquals([
            'invite_only_enabled' => true,
            'email_verification_required' => true,
            'telegram_bot_username' => null,
        ], $settings);
    }

    public function test_get_public_settings_falls_back_to_configured_telegram_bot_username()
    {
        Config::set('telegram.user_bot.username', '@meo_test_bot');

        $settings = $this->service->getPublicSettings();

        $this->assertEquals('meo_test_bot', $settings['telegram_bot_username']);
    }

    public function test_database_settings_do_not_override_telegram_bot_username_from_env_config()
    {
        Config::set('telegram.user_bot.username', 'meo_config_bot');
        Settings::set('telegram_bot_username', 'meo_db_bot');

        $this->assertSame('meo_config_bot', $this->service->getTelegramBotUsername());
    }

    public function test_settings_are_cached()
    {
        // First call should hit database
        $this->service->configureInviteOnlyMode(true);

        // Clear the database but not cache
        Settings::where('key', 'invite_only_enabled')->delete();

        // Should still return true from cache
        $this->assertTrue($this->service->isInviteOnlyEnabled());
    }

    public function test_clear_cache_removes_cached_values()
    {
        $this->service->configureInviteOnlyMode(true);

        // Clear cache
        $this->service->clearCache();

        // Delete from database
        Settings::where('key', 'invite_only_enabled')->delete();

        // Should now return false (default) since cache is cleared
        $this->assertFalse($this->service->isInviteOnlyEnabled());
    }

    public function test_default_storage_limit_returns_fallback_when_not_configured()
    {
        $this->assertSame(50, $this->service->getDefaultStorageLimitMb());
    }

    public function test_premium_storage_limit_returns_fallback_when_not_configured()
    {
        $this->assertSame(5120, $this->service->getPremiumStorageLimitMb());
    }

    public function test_can_configure_storage_limits()
    {
        $this->service->configureDefaultStorageLimitMb(128);
        $this->service->configurePremiumStorageLimitMb(10240);

        $this->assertSame(128, $this->service->getDefaultStorageLimitMb());
        $this->assertSame(10240, $this->service->getPremiumStorageLimitMb());
    }

    public function test_storage_limit_bytes_for_regular_user_uses_default_limit()
    {
        $user = User::factory()->create();

        $this->assertSame(50 * 1024 * 1024, $this->service->getStorageLimitBytesForUser($user));
    }

    public function test_storage_limit_bytes_for_premium_user_uses_premium_limit()
    {
        Role::firstOrCreate(['name' => 'premium', 'guard_name' => 'web']);
        $user = User::factory()->create();
        $user->assignRole('premium');

        $this->assertSame(5 * 1024 * 1024 * 1024, $this->service->getStorageLimitBytesForUser($user));
    }
}
