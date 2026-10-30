<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PetStatus;
use App\Enums\PlacementRequestStatus;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use App\Services\Seo\SitemapService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * One URL per language on the public pages, which is what hreflang needs.
 *
 * Before this, the locale came only from Accept-Language and localStorage, so
 * every language shared a URL and there was nothing for a crawler to point at.
 */
class LocaleUrlTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.frontend_url' => 'http://localhost']);
        app(SitemapService::class)->forget('http://localhost');
    }

    #[Test]
    public function a_localized_landing_page_serves_the_shell(): void
    {
        $this->get('/vi')
            ->assertOk()
            ->assertSee('<link rel="canonical" href="http://localhost/vi">', false);
    }

    #[Test]
    public function every_public_page_declares_its_alternates_and_an_x_default(): void
    {
        $response = $this->get('/requests');

        $response->assertOk()
            ->assertSee('<link rel="alternate" hreflang="en" href="http://localhost/requests">', false)
            ->assertSee('<link rel="alternate" hreflang="vi" href="http://localhost/vi/requests">', false)
            ->assertSee('<link rel="alternate" hreflang="uk" href="http://localhost/uk/requests">', false)
            ->assertSee('<link rel="alternate" hreflang="ru" href="http://localhost/ru/requests">', false)
            ->assertSee('<link rel="alternate" hreflang="x-default" href="http://localhost/requests">', false);
    }

    #[Test]
    public function a_localized_page_canonicalises_to_itself_and_lists_the_same_alternates(): void
    {
        // The alternate set must not change with the language being read, or
        // each translation would advertise a different graph of siblings.
        $this->get('/uk/requests')
            ->assertOk()
            ->assertSee('<link rel="canonical" href="http://localhost/uk/requests">', false)
            ->assertSee('<link rel="alternate" hreflang="en" href="http://localhost/requests">', false)
            ->assertSee('<link rel="alternate" hreflang="uk" href="http://localhost/uk/requests">', false);
    }

    #[Test]
    public function the_url_outranks_accept_language(): void
    {
        // A crawler asking for /vi/... in English must still get Vietnamese, or
        // the alternates promise a translation the page does not deliver.
        $this->get('/vi', ['Accept-Language' => 'en-US,en;q=0.9'])
            ->assertOk()
            ->assertSee('<meta property="og:locale" content="vi_VN">', false);
    }

    #[Test]
    public function an_unprefixed_page_still_honours_accept_language(): void
    {
        $this->get('/', ['Accept-Language' => 'ru'])
            ->assertOk()
            ->assertSee('<meta property="og:locale" content="ru_RU">', false);
    }

    #[Test]
    public function the_default_locale_prefix_redirects_to_the_canonical_url(): void
    {
        // /en/... would be a second address for a page that already has one.
        $this->get('/en/requests')->assertRedirect('/requests');
        $this->get('/en')->assertRedirect('/');
    }

    #[Test]
    public function an_unsupported_locale_prefix_is_not_a_shell_route(): void
    {
        // It falls through to the SPA catch-all rather than serving metadata
        // for a language the app does not have.
        $this->get('/de/requests')
            ->assertOk()
            ->assertDontSee('<link rel="canonical"', false);
    }

    #[Test]
    public function a_localized_listing_page_serves_the_listing_metadata(): void
    {
        $owner = User::factory()->create();
        $pet = Pet::factory()->for($owner)->create([
            'name' => 'Minnie',
            'status' => PetStatus::ACTIVE,
        ]);
        $request = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN,
        ]);

        $this->get('/vi/requests/'.$request->id)
            ->assertOk()
            ->assertSee('Minnie', false)
            ->assertSee('<link rel="canonical" href="http://localhost/vi/requests/'.$request->id.'">', false);
    }

    #[Test]
    public function the_sitemap_lists_every_page_in_every_language(): void
    {
        $response = $this->get('/sitemap.xml');

        $response->assertOk();
        $body = $response->getContent();
        self::assertIsString($body);

        self::assertStringContainsString('xmlns:xhtml="http://www.w3.org/1999/xhtml"', $body);
        self::assertStringContainsString('<loc>http://localhost/vi/requests</loc>', $body);
        self::assertStringContainsString('<loc>http://localhost/uk/helpers</loc>', $body);
        self::assertStringContainsString('<loc>http://localhost/ru</loc>', $body);
        self::assertStringContainsString(
            '<xhtml:link rel="alternate" hreflang="x-default" href="http://localhost/requests"/>',
            $body,
        );
    }

    #[Test]
    public function the_sitemap_still_lists_the_unprefixed_url_for_the_default_locale(): void
    {
        $response = $this->get('/sitemap.xml');
        $body = $response->getContent();
        self::assertIsString($body);

        // Not /en/requests, which only ever redirects.
        self::assertStringContainsString('<loc>http://localhost/requests</loc>', $body);
        self::assertStringNotContainsString('<loc>http://localhost/en/requests</loc>', $body);
    }
}
