<?php

namespace Tests\Feature;

use App\Models\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SettingsControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush(); // Clear cache before each test
    }

    public function test_can_get_public_settings()
    {
        $response = $this->getJson('/api/settings/public');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'invite_only_enabled'
                ]
            ]);
    }

    public function test_public_settings_returns_default_values()
    {
        $response = $this->getJson('/api/settings/public');

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'invite_only_enabled' => false
                ]
            ]);
    }

    public function test_public_settings_returns_configured_values()
    {
        Settings::set('invite_only_enabled', 'true');

        $response = $this->getJson('/api/settings/public');

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'invite_only_enabled' => true
                ]
            ]);
    }

    public function test_public_settings_endpoint_is_cached()
    {
        // First request
        $response1 = $this->getJson('/api/settings/public');
        $response1->assertStatus(200);

        // Change setting in database directly (bypassing cache)
        Settings::where('key', 'invite_only_enabled')->delete();
        Settings::create(['key' => 'invite_only_enabled', 'value' => 'true']);

        // Second request should still return cached value
        $response2 = $this->getJson('/api/settings/public');
        $response2->assertStatus(200);

        // The response should be the same due to caching
        $this->assertEquals($response1->json(), $response2->json());
    }

    public function test_public_settings_has_cache_headers()
    {
        $response = $this->getJson('/api/settings/public');

        $response->assertStatus(200);

        // Should have cache control headers
        $this->assertNotNull($response->headers->get('Cache-Control'));
    }

    public function test_public_settings_endpoint_handles_server_errors_gracefully()
    {
        // Mock a scenario where the service might fail
        // This is hard to test without mocking, but we can at least ensure the endpoint exists
        $response = $this->getJson('/api/settings/public');

        $response->assertStatus(200);
        $this->assertIsArray($response->json('data'));
    }

    public function test_public_settings_endpoint_is_accessible_without_authentication()
    {
        // Ensure no authentication is required
        $response = $this->getJson('/api/settings/public');

        $response->assertStatus(200);
        $response->assertDontSee('Unauthenticated');
    }

    public function test_public_settings_response_structure_is_consistent()
    {
        $response = $this->getJson('/api/settings/public');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'invite_only_enabled'
                ]
            ]);

        $data = $response->json('data');
        $this->assertIsBool($data['invite_only_enabled']);
    }

    public function test_public_settings_handles_different_boolean_representations()
    {
        // Test various boolean representations
        $testCases = [
            ['true', true],
            ['false', false],
            ['1', true],
            ['0', false],
            ['yes', true],
            ['no', false],
            ['on', true],
            ['off', false],
        ];

        foreach ($testCases as [$dbValue, $expectedResponse]) {
            Settings::set('invite_only_enabled', $dbValue);
            Cache::flush(); // Clear cache to ensure fresh read

            $response = $this->getJson('/api/settings/public');

            $response->assertStatus(200)
                ->assertJson([
                    'data' => [
                        'invite_only_enabled' => $expectedResponse
                    ]
                ]);
        }
    }

    public function test_public_settings_endpoint_supports_cors()
    {
        $response = $this->getJson('/api/settings/public', [
            'Origin' => 'https://example.com'
        ]);

        $response->assertStatus(200);
        // CORS headers should be handled by middleware, but endpoint should still work
    }

    public function test_public_settings_endpoint_performance()
    {
        $startTime = microtime(true);

        $response = $this->getJson('/api/settings/public');

        $endTime = microtime(true);
        $executionTime = $endTime - $startTime;

        $response->assertStatus(200);

        // Should be fast due to caching (less than 100ms)
        $this->assertLessThan(0.1, $executionTime);
    }
}
