<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RateLimitingTest extends TestCase
{
    /**
     * Override the 'authenticated' limiter to a low value so we can trigger 429 quickly.
     */
    private function setAuthenticatedLimit(int $limit): void
    {
        RateLimiter::for('authenticated', function ($request) use ($limit) {
            return Limit::perMinute($limit)->by($request->user()?->id ?: $request->ip());
        });
    }

    /**
     * Override the 'public-api' limiter to a low value so we can trigger 429 quickly.
     */
    private function setPublicApiLimit(int $limit): void
    {
        RateLimiter::for('public-api', function ($request) use ($limit) {
            return Limit::perMinute($limit)->by($request->ip());
        });
    }

    #[Test]
    public function authenticated_limiter_returns_429_on_verified_endpoint(): void
    {
        $this->setAuthenticatedLimit(2);

        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/my-pets');
        $this->actingAs($user)->getJson('/api/my-pets');

        $response = $this->actingAs($user)->getJson('/api/my-pets');
        $response->assertStatus(429);
        $response->assertHeader('Retry-After');
    }

    #[Test]
    public function authenticated_limiter_returns_429_on_unverified_endpoint(): void
    {
        $this->setAuthenticatedLimit(2);

        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/users/me');
        $this->actingAs($user)->getJson('/api/users/me');

        $response = $this->actingAs($user)->getJson('/api/users/me');
        $response->assertStatus(429);
        $response->assertHeader('Retry-After');
    }

    #[Test]
    public function authenticated_limiter_returns_429_on_plain_auth_endpoint(): void
    {
        $this->setAuthenticatedLimit(2);

        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/email/verification-status');
        $this->actingAs($user)->getJson('/api/email/verification-status');

        $response = $this->actingAs($user)->getJson('/api/email/verification-status');
        $response->assertStatus(429);
        $response->assertHeader('Retry-After');
    }

    #[Test]
    public function public_api_limiter_returns_429_on_public_listing_endpoint(): void
    {
        $this->setPublicApiLimit(2);

        $this->getJson('/api/pet-types');
        $this->getJson('/api/pet-types');

        $response = $this->getJson('/api/pet-types');
        $response->assertStatus(429);
        $response->assertHeader('Retry-After');
    }

    #[Test]
    public function rate_limit_headers_are_present_on_successful_responses(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/my-pets');
        $response->assertHeader('X-RateLimit-Limit');
        $response->assertHeader('X-RateLimit-Remaining');
    }
}
