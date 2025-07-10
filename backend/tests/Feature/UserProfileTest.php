<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_get_their_own_profile(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/users/me');

        $response->assertStatus(200)
            ->assertJson([
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ]);
    }

    public function test_guest_cannot_get_profile_information(): void
    {
        $response = $this->getJson('/api/users/me');
        $response->assertStatus(401);
    }

    public function test_user_can_update_their_own_profile(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $updateData = [
            'name' => 'New Name',
            'email' => 'newemail@example.com',
        ];

        $response = $this->putJson('/api/users/me', $updateData);

        $response->assertStatus(200)
            ->assertJson([
                'name' => 'New Name',
                'email' => 'newemail@example.com',
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Name',
            'email' => 'newemail@example.com',
        ]);
    }

    public function test_user_cannot_update_profile_with_existing_email(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        Sanctum::actingAs($user1);

        $updateData = [
            'email' => $user2->email,
        ];

        $response = $this->putJson('/api/users/me', $updateData);

        $response->assertStatus(422);
    }
}