<?php

namespace Tests\Feature;

use App\Models\HelperProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HelperProfileApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_get_all_public_helper_profiles()
    {
        $user = User::factory()->create();
        HelperProfile::factory()->count(3)->create(['is_public' => true]);
        HelperProfile::factory()->count(2)->create(['is_public' => false]);

        $response = $this->actingAs($user)->getJson('/api/helper-profiles');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_can_get_a_specific_helper_profile()
    {
        $user = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create();

        $response = $this->actingAs($user)->getJson("/api/helper-profiles/{$helperProfile->id}");

        $response->assertStatus(200)
            ->assertJson(['data' => ['id' => $helperProfile->id]]);
    }
}
