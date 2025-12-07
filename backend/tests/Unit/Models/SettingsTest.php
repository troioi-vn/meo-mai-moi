<?php

namespace Tests\Unit\Models;

use App\Models\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush(); // Clear cache before each test
    }

    public function test_get_returns_default_value_when_setting_does_not_exist()
    {
        $result = Settings::get('non_existent_key', 'default_value');

        $this->assertEquals('default_value', $result);
    }

    public function test_get_returns_null_when_no_default_provided()
    {
        $result = Settings::get('non_existent_key');

        $this->assertNull($result);
    }

    public function test_set_creates_new_setting()
    {
        Settings::set('test_key', 'test_value');

        $this->assertDatabaseHas('settings', [
            'key' => 'test_key',
            'value' => 'test_value',
        ]);
    }

    public function test_set_updates_existing_setting()
    {
        Settings::set('test_key', 'initial_value');
        Settings::set('test_key', 'updated_value');

        $this->assertDatabaseHas('settings', [
            'key' => 'test_key',
            'value' => 'updated_value',
        ]);

        // Should only have one record
        $this->assertEquals(1, Settings::where('key', 'test_key')->count());
    }

    public function test_get_returns_stored_value()
    {
        Settings::set('test_key', 'stored_value');

        $result = Settings::get('test_key');

        $this->assertEquals('stored_value', $result);
    }

    public function test_toggle_changes_false_to_true()
    {
        Settings::set('toggle_key', 'false');

        $result = Settings::toggle('toggle_key');

        $this->assertTrue($result);
        $this->assertEquals('true', Settings::get('toggle_key'));
    }

    public function test_toggle_changes_true_to_false()
    {
        Settings::set('toggle_key', 'true');

        $result = Settings::toggle('toggle_key');

        $this->assertFalse($result);
        $this->assertEquals('false', Settings::get('toggle_key'));
    }

    public function test_toggle_defaults_to_true_for_non_existent_setting()
    {
        $result = Settings::toggle('new_toggle_key');

        $this->assertTrue($result);
        $this->assertEquals('true', Settings::get('new_toggle_key'));
    }

    public function test_is_invite_only_enabled_returns_false_by_default()
    {
        $result = Settings::isInviteOnlyEnabled();

        $this->assertFalse($result);
    }

    public function test_is_invite_only_enabled_returns_true_when_enabled()
    {
        Settings::set('invite_only_enabled', 'true');

        $result = Settings::isInviteOnlyEnabled();

        $this->assertTrue($result);
    }

    public function test_is_invite_only_enabled_handles_various_truthy_values()
    {
        $truthyValues = ['true', '1', 'yes', 'on'];

        foreach ($truthyValues as $value) {
            Settings::set('invite_only_enabled', $value);
            $this->assertTrue(Settings::isInviteOnlyEnabled(), "Failed for value: {$value}");
        }
    }

    public function test_is_invite_only_enabled_handles_various_falsy_values()
    {
        $falsyValues = ['false', '0', 'no', 'off', ''];

        foreach ($falsyValues as $value) {
            Settings::set('invite_only_enabled', $value);
            $this->assertFalse(Settings::isInviteOnlyEnabled(), "Failed for value: {$value}");
        }
    }

    public function test_set_invite_only_enabled_stores_true_as_string()
    {
        Settings::updateInviteOnlyMode(true);

        $this->assertEquals('true', Settings::get('invite_only_enabled'));
        $this->assertTrue(Settings::isInviteOnlyEnabled());
    }

    public function test_set_invite_only_enabled_stores_false_as_string()
    {
        Settings::updateInviteOnlyMode(false);

        $this->assertEquals('false', Settings::get('invite_only_enabled'));
        $this->assertFalse(Settings::isInviteOnlyEnabled());
    }

    public function test_settings_are_cached()
    {
        // Clear cache first to ensure clean state
        Cache::flush();

        Settings::set('cached_key', 'cached_value');

        // Get the value to ensure it's cached
        $firstResult = Settings::get('cached_key');
        $this->assertEquals('cached_value', $firstResult);

        // Delete from database but not cache
        Settings::where('key', 'cached_key')->delete();

        // Should still return cached value
        $result = Settings::get('cached_key');
        $this->assertEquals('cached_value', $result);
    }

    public function test_set_clears_cache()
    {
        // Clear cache first to ensure clean state
        Cache::flush();

        Settings::set('cache_test_key', 'initial_value');

        // Get the value to ensure it's cached
        $firstResult = Settings::get('cache_test_key');
        $this->assertEquals('initial_value', $firstResult);

        // Delete from database but not cache
        Settings::where('key', 'cache_test_key')->delete();

        // Verify it's still cached
        $cachedResult = Settings::get('cache_test_key');
        $this->assertEquals('initial_value', $cachedResult);

        // Set new value (should clear cache and create new record)
        Settings::set('cache_test_key', 'new_value');

        // Should return new value from database
        $result = Settings::get('cache_test_key');
        $this->assertEquals('new_value', $result);
    }
}
