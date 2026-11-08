<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementResponseStatus;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\HelperProfile;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\User;
use Database\Seeders\PetTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlacementPosterCapabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_creator_member_and_responder_member_can_print_without_gaining_response_management(): void
    {
        $this->seed(PetTypeSeeder::class);
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $group = Group::factory()->create(['created_by_user_id' => $owner->id]);
        $membership = GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id, 'user_id' => $member->id,
        ]);
        GroupPet::factory()->active()->create(['group_id' => $group->id, 'pet_id' => $pet->id]);
        $request = PlacementRequest::factory()->create([
            'pet_id' => $pet->id, 'user_id' => $owner->id, 'status' => PlacementRequestStatus::OPEN,
        ]);

        foreach (['', '/me'] as $suffix) {
            $this->actingAs($member)->getJson("/api/placement-requests/{$request->id}{$suffix}")
                ->assertOk()->assertJsonPath('data.viewer_role', 'owner')
                ->assertJsonPath('data.available_actions.can_print_poster', true);
        }
        $response = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $request->id,
            'helper_profile_id' => HelperProfile::factory()->create(['user_id' => $member->id])->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);
        foreach (['', '/me'] as $suffix) {
            $this->actingAs($member)->getJson("/api/placement-requests/{$request->id}{$suffix}")
                ->assertOk()->assertJsonPath('data.viewer_role', 'helper')
                ->assertJsonPath('data.available_actions.can_print_poster', true)
                ->assertJsonPath('data.available_actions.can_accept_responses', false);
        }
        $this->actingAs($member)->postJson("/api/placement-responses/{$response->id}/accept")->assertForbidden();
        $membership->update(['end_at' => now()]);
        $this->actingAs($member)->getJson("/api/placement-requests/{$request->id}")
            ->assertOk()->assertJsonPath('data.available_actions.can_print_poster', false);
    }

    public function test_only_an_open_listing_grants_the_capability_and_public_or_unrelated_viewers_do_not_get_it(): void
    {
        $this->seed(PetTypeSeeder::class);
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $request = PlacementRequest::factory()->create([
            'pet_id' => $pet->id, 'user_id' => $owner->id, 'status' => PlacementRequestStatus::OPEN,
        ]);
        $this->getJson("/api/placement-requests/{$request->id}")->assertOk()
            ->assertJsonPath('data.available_actions.can_print_poster', false);
        $this->actingAs(User::factory()->create())->getJson("/api/placement-requests/{$request->id}")
            ->assertOk()->assertJsonPath('data.available_actions.can_print_poster', false);
        $this->actingAs($owner)->getJson("/api/placement-requests/{$request->id}")
            ->assertOk()->assertJsonPath('data.available_actions.can_print_poster', true);
        $request->update(['status' => PlacementRequestStatus::CANCELLED]);
        // Optional routes use web; /me uses Sanctum. Replace both cached guards.
        $this->actingAs($owner, 'sanctum');
        $this->actingAs($owner, 'web');
        foreach (['', '/me'] as $suffix) {
            $this->actingAs($owner)->getJson("/api/placement-requests/{$request->id}{$suffix}")
                ->assertOk()->assertJsonPath('data.available_actions.can_print_poster', false);
        }
    }
}
