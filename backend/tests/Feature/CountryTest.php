<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Country;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CountryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(User::factory()->create());
    }

    public function test_can_list_active_countries_with_phone_prefix(): void
    {
        Country::create([
            'code' => 'VN',
            'name' => 'Vietnam (Custom)',
            'phone_prefix' => '+84',
            'is_active' => true,
        ]);

        Country::create([
            'code' => 'US',
            'name' => 'US',
            'phone_prefix' => '+1',
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/countries');

        $response->assertStatus(200)
            ->assertJsonFragment([
                'code' => 'VN',
                'name' => 'Vietnam (Custom)',
                'phone_prefix' => '+84',
            ])
            ->assertJsonMissing([
                'code' => 'US',
            ]);
    }

    public function test_countries_endpoint_returns_iso_wide_list_when_no_country_rows_exist(): void
    {
        $response = $this->getJson('/api/countries');

        $response->assertStatus(200)
            ->assertJsonFragment([
                'code' => 'VN',
            ]);

        $this->assertGreaterThan(200, count($response->json('data') ?? []));
    }

    public function test_countries_endpoint_returns_localized_country_names_from_accept_language(): void
    {
        $response = $this
            ->withHeader('Accept-Language', 'ru')
            ->getJson('/api/countries');

        $response->assertStatus(200)
            ->assertJsonFragment([
                'code' => 'VN',
                'name' => 'Вьетнам',
            ]);
    }
}
