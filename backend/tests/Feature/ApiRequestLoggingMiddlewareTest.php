<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Settings;
use App\Models\User;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ApiRequestLoggingMiddlewareTest extends TestCase
{
    #[Test]
    public function session_authenticated_requests_are_logged(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/users/me')->assertOk();

        $this->assertDatabaseHas('api_request_logs', [
            'user_id' => $user->id,
            'path' => 'api/users/me',
            'route_uri' => 'api/users/me',
            'auth_mode' => 'session',
            'status_code' => 200,
        ]);
    }

    #[Test]
    public function pat_authenticated_requests_are_logged(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('Test Token', ['read']);

        $this->withToken(explode('|', $token->plainTextToken, 2)[1])
            ->getJson('/api/users/me')
            ->assertOk();

        $this->assertDatabaseHas('api_request_logs', [
            'user_id' => $user->id,
            'path' => 'api/users/me',
            'route_uri' => 'api/users/me',
            'auth_mode' => 'pat',
            'status_code' => 200,
        ]);
    }

    #[Test]
    public function quota_denied_requests_are_logged_once(): void
    {
        Settings::set('api_daily_quota_regular', '1');

        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/users/me')->assertOk();
        $this->actingAs($user)->getJson('/api/users/me')->assertStatus(429);

        $this->assertDatabaseCount('api_request_logs', 2);
        $this->assertDatabaseHas('api_request_logs', [
            'user_id' => $user->id,
            'path' => 'api/users/me',
            'route_uri' => 'api/users/me',
            'auth_mode' => 'session',
            'status_code' => 429,
        ]);
    }
}
