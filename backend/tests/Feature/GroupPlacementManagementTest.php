<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PetRelationshipType;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\PlacementResponseStatus;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\HelperProfile;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GroupPlacementManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_group_member_can_create_and_manage_responses_for_shared_pet(): void
    {
        [$owner, $member, $pet] = $this->groupPetFixture();
        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        $createResponse = $this->actingAs($member)->postJson('/api/placement-requests', [
            'pet_id' => $pet->id,
            'request_type' => PlacementRequestType::PERMANENT->value,
            'start_date' => now()->addDay()->toDateString(),
        ]);

        $createResponse->assertCreated()
            ->assertJsonPath('data.user_id', $member->id);

        $placementRequest = PlacementRequest::query()->sole();
        $rejectedResponse = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        $this->actingAs($member)
            ->postJson("/api/placement-responses/{$rejectedResponse->id}/reject")
            ->assertOk()
            ->assertJsonPath('data.status', PlacementResponseStatus::REJECTED->value);

        $secondHelper = User::factory()->create();
        $acceptedResponse = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => HelperProfile::factory()->create(['user_id' => $secondHelper->id])->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        $this->actingAs($member)
            ->postJson("/api/placement-responses/{$acceptedResponse->id}/accept")
            ->assertOk()
            ->assertJsonPath('data.status', PlacementResponseStatus::ACCEPTED->value);

        $this->assertSame($owner->id, $pet->relationships()
            ->where('relationship_type', PetRelationshipType::OWNER)
            ->value('user_id'));
    }

    public function test_editor_and_stranger_cannot_create_or_manage_placement_responses(): void
    {
        $owner = User::factory()->create();
        $editor = User::factory()->create();
        $stranger = User::factory()->create();
        $helper = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        PetRelationship::factory()->editor()->active()->create([
            'pet_id' => $pet->id,
            'user_id' => $editor->id,
            'created_by' => $owner->id,
        ]);

        $payload = [
            'pet_id' => $pet->id,
            'request_type' => PlacementRequestType::PERMANENT->value,
            'start_date' => now()->addDay()->toDateString(),
        ];

        $this->actingAs($editor)->postJson('/api/placement-requests', $payload)->assertForbidden();
        $this->actingAs($stranger)->postJson('/api/placement-requests', $payload)->assertForbidden();

        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN,
        ]);
        $placementResponse = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => HelperProfile::factory()->create(['user_id' => $helper->id])->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        $this->actingAs($editor)
            ->postJson("/api/placement-responses/{$placementResponse->id}/accept")
            ->assertForbidden();
        $this->actingAs($stranger)
            ->postJson("/api/placement-responses/{$placementResponse->id}/reject")
            ->assertForbidden();
    }

    public function test_group_member_is_owner_side_and_cannot_respond_to_group_request(): void
    {
        [, $member, $pet] = $this->groupPetFixture();
        HelperProfile::factory()->create(['user_id' => $member->id]);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'status' => PlacementRequestStatus::OPEN,
        ]);

        $this->actingAs($member)
            ->getJson("/api/placement-requests/{$placementRequest->id}")
            ->assertOk()
            ->assertJsonPath('data.viewer_role', 'owner')
            ->assertJsonPath('data.available_actions.can_respond', false)
            ->assertJsonPath('data.available_actions.can_quick_respond', false);

        $this->actingAs($member)
            ->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertForbidden();
    }

    public function test_active_responder_stays_helper_after_joining_group_and_cannot_accept_own_response(): void
    {
        [$owner, $member, $pet, $group] = $this->groupPetFixture(false);
        $helperProfile = HelperProfile::factory()->create(['user_id' => $member->id]);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN,
        ]);
        $placementResponse = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $owner->id,
        ]);

        $this->actingAs($member)
            ->getJson("/api/placement-requests/{$placementRequest->id}")
            ->assertOk()
            ->assertJsonPath('data.viewer_role', 'helper')
            ->assertJsonPath('data.available_actions.can_accept_responses', false);

        $this->actingAs($member)
            ->postJson("/api/placement-responses/{$placementResponse->id}/accept")
            ->assertForbidden();
    }

    /**
     * @return array{User, User, Pet, Group}
     */
    private function groupPetFixture(bool $addMember = true): array
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $group = Group::factory()->create(['created_by_user_id' => $owner->id]);

        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $owner->id,
        ]);

        if ($addMember) {
            GroupMembership::factory()->member()->active()->create([
                'group_id' => $group->id,
                'user_id' => $member->id,
                'invited_by_user_id' => $owner->id,
            ]);
        }

        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $pet->id,
            'added_by_user_id' => $owner->id,
        ]);

        return [$owner, $member, $pet, $group];
    }
}
