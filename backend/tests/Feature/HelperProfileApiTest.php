<?php

namespace Tests\Feature;

use App\Models\HelperProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class HelperProfileApiTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function can_get_all_public_helper_profiles()
    {
        $user = User::factory()->create();
        HelperProfile::factory()->count(3)->create(['is_public' => true]);
        HelperProfile::factory()->count(2)->create(['is_public' => false]);

        $response = $this->actingAs($user)->getJson('/api/helper-profiles');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    #[Test]
    public function can_get_a_specific_helper_profile()
    {
        $user = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['is_public' => true]);

        $response = $this->actingAs($user)->getJson("/api/helper-profiles/{$helperProfile->id}");

        $response->assertStatus(200)
            ->assertJson(['data' => ['id' => $helperProfile->id]]);
    }

    #[Test]
    public function can_create_a_helper_profile()
    {
        $user = User::factory()->create();

        $data = [
            'country' => 'Test Country',
            'address' => '123 Test St',
            'city' => 'Testville',
            'state' => 'TS',
            'phone_number' => '123-456-7890',
            'experience' => 'Lots of experience',
            'has_pets' => true,
            'has_children' => false,
            'can_foster' => true,
            'can_adopt' => false,
            'is_public' => true,
            'zip_code' => '12345',
        ];

        $response = $this->actingAs($user)->postJson('/api/helper-profiles', $data);

        $response->assertStatus(201)
            ->assertJson(['data' => $data]);

        $this->assertDatabaseHas('helper_profiles', $data);
    }

    #[Test]
    public function owner_can_delete_their_helper_profile()
    {
        $user = User::factory()->create();
        $profile = HelperProfile::factory()->for($user)->create();

        $response = $this->actingAs($user)->deleteJson("/api/helper-profiles/{$profile->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('helper_profiles', ['id' => $profile->id]);
    }

    #[Test]
    public function unauthenticated_delete_is_unauthorized()
    {
        $profile = HelperProfile::factory()->create();

        $response = $this->deleteJson("/api/helper-profiles/{$profile->id}");

        $response->assertStatus(401); // Sanctum guard should return 401
    }

    #[Test]
    public function non_owner_cannot_delete_helper_profile()
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $profile = HelperProfile::factory()->for($owner)->create();

        $response = $this->actingAs($other)->deleteJson("/api/helper-profiles/{$profile->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('helper_profiles', ['id' => $profile->id]);
    }
}