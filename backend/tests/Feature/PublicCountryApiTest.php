<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Country reference data without an account.
 *
 * Deliberately a separate class from CountryTest, which authenticates in
 * setUp(). That is precisely why nobody noticed this endpoint returned 401 to
 * guests: the quick-response sheet asks for a phone number before anyone signs
 * in, and an empty prefix picker made it unusable for the one visitor it exists
 * for.
 */
class PublicCountryApiTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function an_anonymous_visitor_can_list_countries(): void
    {
        $this->getJson('/api/countries')
            ->assertOk()
            ->assertJsonFragment(['code' => 'VN']);
    }

    #[Test]
    public function an_anonymous_visitor_gets_dialling_prefixes(): void
    {
        $response = $this->getJson('/api/countries')->assertOk();

        $vietnam = collect($response->json('data'))->firstWhere('code', 'VN');

        $this->assertNotNull($vietnam);
        $this->assertSame('+84', $vietnam['phone_prefix']);
    }
}
