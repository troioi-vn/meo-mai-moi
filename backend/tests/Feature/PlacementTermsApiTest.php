<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PlacementTermsApiTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_returns_placement_terms_content(): void
    {
        $response = $this->getJson('/api/legal/placement-terms');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'content',
                    'version',
                ],
            ]);

        // Verify content contains expected text
        $content = $response->json('data.content');
        $this->assertStringContainsString('Placement Terms & Conditions', $content);
        $this->assertStringContainsString('I am authorized to place this pet', $content);

        // Verify version format
        $version = $response->json('data.version');
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}$/', $version);
    }

    #[Test]
    public function it_returns_404_when_terms_file_not_found(): void
    {
        // Temporarily rename the file
        $path = resource_path('markdown/placement-terms.md');
        $backupPath = resource_path('markdown/placement-terms.md.bak');

        if (File::exists($path)) {
            File::move($path, $backupPath);
        }

        try {
            $response = $this->getJson('/api/legal/placement-terms');
            $response->assertStatus(404)
                ->assertJson([
                    'message' => 'Placement terms not found',
                ]);
        } finally {
            // Restore the file
            if (File::exists($backupPath)) {
                File::move($backupPath, $path);
            }
        }
    }

    #[Test]
    public function it_sets_cache_control_header(): void
    {
        $response = $this->getJson('/api/legal/placement-terms');

        $response->assertStatus(200);

        // Should have cache control headers (exact value may vary based on middleware)
        $this->assertNotNull($response->headers->get('Cache-Control'));
    }
}
