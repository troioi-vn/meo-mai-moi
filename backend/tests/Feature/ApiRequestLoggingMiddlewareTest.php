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
    public function bearer_tokens_in_route_paths_are_logged_only_as_templates(): void
    {
        $token = str_repeat('A', 64);

        $this->getJson("/api/resource-invitations/{$token}")->assertNotFound();

        $this->assertDatabaseHas('api_request_logs', [
            'path' => 'api/resource-invitations/{token}',
            'route_uri' => 'api/resource-invitations/{token}',
            'status_code' => 404,
        ]);
        $this->assertDatabaseMissing('api_request_logs', [
            'path' => "api/resource-invitations/{$token}",
        ]);
    }

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
