<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\HelperProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

use PHPUnit\Framework\Attributes\Test;

class HelperProfileTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_user_can_create_helper_profile()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/helper-profiles', [
            'address' => '123 Main St',
            'city' => 'Anytown',
            'state' => 'Anystate',
            'zip_code' => '12345',
            'phone_number' => '555-123-4567',
            'experience' => 'Some experience',
            'has_pets' => true,
            'has_children' => false,
            'can_foster' => true,
            'can_adopt' => false,
            'location' => 'Anytown, Anystate',
        ]);
        $this->assertDatabaseHas('helper_profiles', [
            'user_id' => $user->id,
            'address' => '123 Main St',
        ]);
    }

    #[Test]
    public function test_user_can_view_their_helper_profile_status()
    {
        $user = User::factory()->create();
        HelperProfile::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->getJson('/api/helper-profiles/me');

        $response->assertOk();
        $response->assertJson(['user_id' => $user->id]);
    }

    #[Test]
    public function test_guest_cannot_create_helper_profile()
    {
        $response = $this->postJson('/api/helper-profiles', [
            'address' => '123 Main St',
            'city' => 'Anytown',
            'state' => 'Anystate',
            'zip_code' => '12345',
            'phone_number' => '555-123-4567',
            'experience' => 'Some experience',
            'has_pets' => true,
            'has_children' => false,
            'can_foster' => true,
            'can_adopt' => false,
            'location' => 'Anytown, Anystate',
        ]);

        $response->assertUnauthorized();
        $this->assertDatabaseMissing('helper_profiles', [
            'address' => '123 Main St',
        ]);
    }
}
