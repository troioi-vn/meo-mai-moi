<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BannedUserReadOnlyTest extends TestCase
{
    use RefreshDatabase;

    public function test_banned_user_has_read_only_access(): void
    {
        $user = User::factory()->create([
            'is_banned' => true,
            'banned_at' => now(),
            'ban_reason' => 'Testing ban',
        ]);

        Sanctum::actingAs($user);

        // Read: allowed
        $this->getJson('/api/users/me')
            ->assertOk()
            ->assertJsonPath('data.is_banned', true)
            ->assertJsonPath('data.ban_reason', 'Testing ban');

        // Write: blocked
        $this->putJson('/api/users/me', [
            'name' => 'New Name',
            'email' => $user->email,
        ])
            ->assertStatus(403)
            ->assertJsonPath('code', 'USER_BANNED');
    }
}
