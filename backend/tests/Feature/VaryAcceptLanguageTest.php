<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\City;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class VaryAcceptLanguageTest extends TestCase
{
    #[Test]
    public function api_json_responses_carry_vary_accept_language(): void
    {
        Sanctum::actingAs(User::factory()->create());
        City::factory()->create(['name' => 'Hanoi', 'country' => 'VN']);

        $response = $this->getJson('/api/cities?country=VN');

        $response->assertStatus(200);
        $this->assertStringContainsString(
            'Accept-Language',
            (string) $response->headers->get('Vary'),
        );
    }

    #[Test]
    public function placement_terms_response_is_not_double_tokened(): void
    {
        $response = $this->getJson('/api/legal/placement-terms');

        $response->assertStatus(200);

        $vary = (string) $response->headers->get('Vary');
        $tokens = array_map(
            fn (string $token): string => strtolower(trim($token)),
            explode(',', $vary),
        );

        $this->assertSame(
            1,
            count(array_filter($tokens, fn (string $token): bool => $token === 'accept-language')),
            "Expected a single Accept-Language token, got Vary: {$vary}",
        );
    }
}
