<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class VersionControllerTest extends TestCase
{
    #[Test]
    public function test_version_endpoint_returns_expected_version(): void
    {
        $response = $this->getJson('/api/version');
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'version' => config('version.api'),
                ],
            ]);
    }
}
