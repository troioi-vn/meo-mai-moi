<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AppVersionHeaderTest extends TestCase
{
    #[Test]
    public function api_responses_include_x_app_version_header(): void
    {
        $response = $this->getJson('/api/version');

        $response->assertStatus(200);
        $response->assertHeader('X-App-Version', config('version.api'));
    }

    #[Test]
    public function x_app_version_header_matches_configured_version(): void
    {
        config(['version.api' => 'v99.0.0-test']);

        $response = $this->getJson('/api/version');

        $response->assertHeader('X-App-Version', 'v99.0.0-test');
    }
}
