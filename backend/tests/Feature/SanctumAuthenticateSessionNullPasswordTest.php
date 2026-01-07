<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SanctumAuthenticateSessionNullPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_stateful_api_does_not_500_when_user_password_is_null_and_session_has_password_hash(): void
    {
        $user = User::factory()->create([
            'password' => null,
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user, 'web');

        $response = $this
            ->withHeader('Origin', 'http://localhost')
            ->withHeader('Referer', 'http://localhost')
            ->withSession([
                // Simulate a stale value from a previous user (e.g. admin before impersonation)
                'password_hash_web' => 'stale-password-hash',
            ])
            ->getJson('/api/users/me');

        $response->assertOk();
    }
}
