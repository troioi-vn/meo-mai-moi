<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PetRelationshipType;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\PlacementResponseStatus;
use App\Exceptions\GroupException;
use App\Exceptions\PlacementException;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\HelperProfile;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\Groups\GroupPetService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GroupPlacementHandoverTest extends TestCase
{
    use RefreshDatabase;

    public function test_transfer_is_created_from_the_pets_owner_not_the_request_creator(): void
    {
        [$owner, $member, $pet] = $this->groupPetFixture();
        $adopter = User::factory()->create();

        // The volunteer types the listing up, but the cat is not theirs to give.
        $placementRequest = $this->openRequest($pet, $member, PlacementRequestType::PERMANENT);
        $response = $this->respondTo($placementRequest, $adopter);

        $this->actingAs($member)
            ->postJson("/api/placement-responses/{$response->id}/accept")
            ->assertOk();

        $transfer = TransferRequest::query()->sole();
        $this->assertSame($owner->id, $transfer->from_user_id);
        $this->assertNotSame($member->id, $transfer->from_user_id);
    }

    public function test_permanent_group_handover_ends_all_rescue_ownership_and_detaches_pet(): void
    {
        [$owner, $member, $pet, $group] = $this->groupPetFixture();
        $adopter = User::factory()->create();

        $placementRequest = $this->openRequest($pet, $member, PlacementRequestType::PERMANENT);
        $response = $this->respondTo($placementRequest, $adopter);

        $this->actingAs($member)
            ->postJson("/api/placement-responses/{$response->id}/accept")
            ->assertOk();

        $transfer = TransferRequest::query()->sole();

        $this->actingAs($adopter)
            ->postJson("/api/transfer-requests/{$transfer->id}/confirm")
            ->assertOk();

        $activeOwnerIds = PetRelationship::query()
            ->where('pet_id', $pet->id)
            ->where('relationship_type', PetRelationshipType::OWNER)
            ->whereNull('end_at')
            ->pluck('user_id')
            ->all();

        $this->assertSame([$adopter->id], $activeOwnerIds, 'the adopter must be the only remaining owner');

        // No consolation viewer grant: the rescue keeps its record, not access.
        $this->assertDatabaseMissing('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'relationship_type' => PetRelationshipType::VIEWER->value,
            'end_at' => null,
        ]);

        $this->assertNotNull(
            GroupPet::query()->where('group_id', $group->id)->where('pet_id', $pet->id)->sole()->end_at,
            'the pet must be detached from the group after adoption'
        );
    }

    public function test_foster_group_placement_keeps_attachment_and_ownership(): void
    {
        [$owner, $member, $pet, $group] = $this->groupPetFixture();
        $fosterer = User::factory()->create();

        $placementRequest = $this->openRequest($pet, $member, PlacementRequestType::FOSTER_FREE);
        $response = $this->respondTo($placementRequest, $fosterer);

        $this->actingAs($member)
            ->postJson("/api/placement-responses/{$response->id}/accept")
            ->assertOk();

        $transfer = TransferRequest::query()->sole();

        $this->actingAs($fosterer)
            ->postJson("/api/transfer-requests/{$transfer->id}/confirm")
            ->assertOk();

        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'relationship_type' => PetRelationshipType::OWNER->value,
            'end_at' => null,
        ]);

        $this->assertNull(
            GroupPet::query()->where('group_id', $group->id)->where('pet_id', $pet->id)->sole()->end_at,
            'fostering must not detach the pet from its group'
        );
    }

    public function test_personal_permanent_rehoming_still_grants_former_owner_viewer(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $adopter = User::factory()->create();

        $placementRequest = $this->openRequest($pet, $owner, PlacementRequestType::PERMANENT);
        $response = $this->respondTo($placementRequest, $adopter);

        $this->actingAs($owner)
            ->postJson("/api/placement-responses/{$response->id}/accept")
            ->assertOk();

        $transfer = TransferRequest::query()->sole();

        $this->actingAs($adopter)
            ->postJson("/api/transfer-requests/{$transfer->id}/confirm")
            ->assertOk();

        $this->assertDatabaseHas('pet_relationships', [
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'relationship_type' => PetRelationshipType::VIEWER->value,
            'end_at' => null,
        ]);
    }

    public function test_losing_an_accept_race_leaves_exactly_one_transfer_request(): void
    {
        [, $member, $pet] = $this->groupPetFixture();
        $placementRequest = $this->openRequest($pet, $member, PlacementRequestType::PERMANENT);

        $first = $this->respondTo($placementRequest, User::factory()->create());
        $second = $this->respondTo($placementRequest, User::factory()->create());

        // Both volunteers loaded the page while the request was open. Freezing the
        // second one's view of it is what the interleaving actually looks like:
        // it passes the unlocked pre-check on stale state, then meets the lock.
        $stale = PlacementRequestResponse::query()
            ->with('placementRequest')
            ->findOrFail($second->id);

        $this->assertTrue($first->accept($member));

        try {
            $stale->accept($member);
            $this->fail('the second accept should have lost the race');
        } catch (PlacementException $exception) {
            $this->assertSame('response_race_lost', $exception->getMessage());
        }

        $this->assertSame(1, TransferRequest::query()->count());
        $this->assertSame(
            PlacementResponseStatus::RESPONDED,
            $second->fresh()->status,
            'the losing response must be left untouched, not half-accepted'
        );
    }

    public function test_pet_cannot_leave_the_group_while_a_placement_is_live(): void
    {
        [$owner, $member, $pet, $group] = $this->groupPetFixture();
        $this->openRequest($pet, $member, PlacementRequestType::PERMANENT);

        $this->expectException(GroupException::class);
        $this->expectExceptionMessage('pet_has_live_placement');

        app(GroupPetService::class)->removePet($group, $pet, $owner);
    }

    public function test_database_rejects_a_second_live_request_of_the_same_type(): void
    {
        [, $member, $pet] = $this->groupPetFixture();
        $this->openRequest($pet, $member, PlacementRequestType::PERMANENT);

        // Bypasses the controller's conflict check on purpose: this asserts the
        // partial unique index holds the rule on its own.
        $this->expectException(UniqueConstraintViolationException::class);

        PlacementRequest::query()->create([
            'pet_id' => $pet->id,
            'user_id' => $member->id,
            'request_type' => PlacementRequestType::PERMANENT,
            'status' => PlacementRequestStatus::OPEN,
            'start_date' => now()->addDay(),
        ]);
    }

    private function openRequest(Pet $pet, User $creator, PlacementRequestType $type): PlacementRequest
    {
        return PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $creator->id,
            'request_type' => $type,
            'status' => PlacementRequestStatus::OPEN,
            'start_date' => now()->addDay(),
        ]);
    }

    private function respondTo(PlacementRequest $placementRequest, User $helper): PlacementRequestResponse
    {
        return PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => HelperProfile::factory()->create(['user_id' => $helper->id])->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);
    }

    /**
     * @return array{User, User, Pet, Group}
     */
    private function groupPetFixture(): array
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $group = Group::factory()->create(['created_by_user_id' => $owner->id]);

        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $owner->id,
        ]);

        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $owner->id,
        ]);

        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $pet->id,
            'added_by_user_id' => $owner->id,
        ]);

        return [$owner, $member, $pet, $group];
    }
}
