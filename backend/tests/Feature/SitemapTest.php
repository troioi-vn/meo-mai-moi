<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\HelperProfileApprovalStatus;
use App\Enums\HelperProfileStatus;
use App\Enums\PlacementRequestStatus;
use App\Models\HelperProfile;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use App\Services\Seo\SitemapService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * /sitemap.xml is the only thing telling a crawler the app's public pages
 * exist; robots.txt used to advertise the docs sitemap and nothing else.
 */
class SitemapTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.frontend_url' => 'http://localhost']);

        // Entries are cached for an hour, which would otherwise leak between tests.
        app(SitemapService::class)->forget(frontend_url());
    }

    private function openRequestFor(string $petName): PlacementRequest
    {
        $owner = User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'name' => $petName]);

        return PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN,
        ]);
    }

    #[Test]
    public function it_lists_the_static_public_pages(): void
    {
        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
            ->assertSee('<loc>http://localhost</loc>', false)
            ->assertSee('<loc>http://localhost/requests</loc>', false)
            ->assertSee('<loc>http://localhost/helpers</loc>', false);
    }

    #[Test]
    public function it_lists_open_placement_requests(): void
    {
        $open = $this->openRequestFor('Minnie');

        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertSee("<loc>http://localhost/requests/{$open->id}</loc>", false);
    }

    #[Test]
    public function it_omits_requests_that_are_no_longer_open(): void
    {
        $closed = $this->openRequestFor('Barsik');
        $closed->update(['status' => PlacementRequestStatus::CANCELLED]);

        app(SitemapService::class)->forget(frontend_url());

        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertDontSee("<loc>http://localhost/requests/{$closed->id}</loc>", false);
    }

    #[Test]
    public function it_lists_approved_public_helper_profiles_only(): void
    {
        $visible = HelperProfile::factory()->create([
            'status' => HelperProfileStatus::PUBLIC,
            'approval_status' => HelperProfileApprovalStatus::APPROVED,
        ]);
        $hidden = HelperProfile::factory()->create([
            'status' => HelperProfileStatus::PRIVATE,
            'approval_status' => HelperProfileApprovalStatus::APPROVED,
        ]);
        $unapproved = HelperProfile::factory()->create([
            'status' => HelperProfileStatus::PUBLIC,
            'approval_status' => HelperProfileApprovalStatus::PENDING,
        ]);

        $response = $this->get('/sitemap.xml')->assertOk();

        $response->assertSee("<loc>http://localhost/helpers/{$visible->id}</loc>", false);
        $response->assertDontSee("<loc>http://localhost/helpers/{$hidden->id}</loc>", false);
        $response->assertDontSee("<loc>http://localhost/helpers/{$unapproved->id}</loc>", false);
    }

    #[Test]
    public function it_never_lists_pet_profiles(): void
    {
        $open = $this->openRequestFor('Minnie');

        $this->get('/sitemap.xml')
            ->assertOk()
            ->assertDontSee("/pets/{$open->pet_id}/view", false);
    }

    #[Test]
    public function it_advertises_the_app_sitemap_in_robots_txt(): void
    {
        $robots = file_get_contents(public_path('robots.txt'));

        $this->assertIsString($robots);
        $this->assertStringContainsString('Sitemap: https://meo-mai-moi.com/sitemap.xml', $robots);

        // The public pet view is the one page under /pets/ that should be
        // crawled, and it survives the broader disallow only by longest match.
        $this->assertStringContainsString('Disallow: /pets/', $robots);
        $this->assertStringContainsString('Allow: /pets/*/view', $robots);
    }
}
