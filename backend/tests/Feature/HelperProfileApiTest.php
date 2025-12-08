<?php

namespace Tests\Feature;

use App\Enums\PlacementRequestType;
use App\Models\HelperProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class HelperProfileApiTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function can_get_own_helper_profiles()
    {
        $user = User::factory()->create();
        // Create owned profiles
        HelperProfile::factory()->count(2)->for($user)->create(['approval_status' => 'approved']);
        HelperProfile::factory()->for($user)->create(['approval_status' => 'pending']);
        // Create other profiles not visible to user
        HelperProfile::factory()->count(2)->create(['approval_status' => 'approved']);

        $response = $this->actingAs($user)->getJson('/api/helper-profiles');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data'); // only own profiles
    }

    #[Test]
    public function owner_can_get_their_specific_helper_profile()
    {
        $user = User::factory()->create();
        $helperProfile = HelperProfile::factory()->for($user)->create(['approval_status' => 'approved']);

        $response = $this->actingAs($user)->getJson("/api/helper-profiles/{$helperProfile->id}");

        $response->assertStatus(200)
            ->assertJson(['data' => ['id' => $helperProfile->id]]);
    }

    #[Test]
    public function can_create_a_helper_profile()
    {
        $user = User::factory()->create();

        $data = [
            'country' => 'VN',
            'address' => '123 Test St',
            'city' => 'Testville',
            'state' => 'TS',
            'phone_number' => '123-456-7890',
            'contact_info' => 'You can also reach me on Telegram @testhelper',
            'experience' => 'Lots of experience',
            'has_pets' => true,
            'has_children' => false,
            'request_types' => [PlacementRequestType::FOSTER_FREE->value, PlacementRequestType::PERMANENT->value],
            'zip_code' => '12345',
        ];

        $response = $this->actingAs($user)->postJson('/api/helper-profiles', $data);

        $response->assertStatus(201)
            ->assertJsonPath('data.country', 'VN')
            ->assertJsonPath('data.request_types', $data['request_types']);

        $this->assertDatabaseHas('helper_profiles', [
            'country' => 'VN',
            'address' => '123 Test St',
            'city' => 'Testville',
        ]);
    }

    #[Test]
    public function cannot_create_helper_profile_without_request_types()
    {
        $user = User::factory()->create();

        $data = [
            'country' => 'VN',
            'address' => '123 Test St',
            'city' => 'Testville',
            'state' => 'TS',
            'phone_number' => '123-456-7890',
            'experience' => 'Lots of experience',
            'has_pets' => true,
            'has_children' => false,
            'request_types' => [],
            'zip_code' => '12345',
        ];

        $response = $this->actingAs($user)->postJson('/api/helper-profiles', $data);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['request_types']);
    }

    #[Test]
    public function owner_can_delete_their_helper_profile()
    {
        $user = User::factory()->create();
        $profile = HelperProfile::factory()->for($user)->create();

        $response = $this->actingAs($user)->deleteJson("/api/helper-profiles/{$profile->id}");

        $response->assertStatus(204);
        // Helper profiles use soft deletes, so record still exists but is soft deleted
        $this->assertSoftDeleted('helper_profiles', ['id' => $profile->id]);
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

    #[Test]
    public function owner_can_view_their_own_helper_profile()
    {
        $owner = User::factory()->create();
        $profile = HelperProfile::factory()->for($owner)->create(['approval_status' => 'pending']);

        $response = $this->actingAs($owner)->getJson("/api/helper-profiles/{$profile->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $profile->id);
    }

    #[Test]
    public function pet_owner_can_view_helper_profile_if_helper_applied_to_their_placement_request()
    {
        $petOwner = User::factory()->create();
        $helperOwner = User::factory()->create();
        $profile = HelperProfile::factory()->for($helperOwner)->create(['approval_status' => 'pending']);

        // Create pet with placement request
        $pet = \App\Models\Pet::factory()->for($petOwner)->create();
        $placementRequest = \App\Models\PlacementRequest::factory()->for($pet)->create([
            'request_type' => \App\Enums\PlacementRequestType::FOSTER_FREE->value,
        ]);
        // Create transfer request (helper applied to placement request)
        \App\Models\TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $profile->id,
            'status' => \App\Enums\TransferRequestStatus::PENDING->value,
        ]);

        $response = $this->actingAs($petOwner)->getJson("/api/helper-profiles/{$profile->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $profile->id);
    }

    #[Test]
    public function user_cannot_view_pending_helper_profile_without_relationship()
    {
        $helperOwner = User::factory()->create();
        $randomUser = User::factory()->create();
        $profile = HelperProfile::factory()->for($helperOwner)->create(['approval_status' => 'pending']);

        $response = $this->actingAs($randomUser)->getJson("/api/helper-profiles/{$profile->id}");

        $response->assertStatus(403);
    }
}
