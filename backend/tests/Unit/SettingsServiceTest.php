<?php

namespace Tests\Unit;

use App\Models\Settings;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
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
        $this->service->configureInviteOnlyMode(true);

        $settings = $this->service->getPublicSettings();

        $this->assertEquals([
            'invite_only_enabled' => true,
        ], $settings);
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
}
