<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\TransferRequestStatus;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\HelperProfile;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\TransferRequestLifecycleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransferRequestOwnerSidePolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_current_owner_is_allowed_owner_side_actions(): void
    {
        [$owner, , $transfer] = $this->pendingTransferFixture();

        $this->assertTrue($owner->can('view', $transfer));
        $this->assertTrue($owner->can('update', $transfer));
        $this->assertTrue($owner->can('cancel', $transfer));
        $this->assertTrue($owner->can('reject', $transfer));
        $this->assertTrue($owner->can('viewResponderProfile', $transfer));
        // The owner is not the recipient.
        $this->assertFalse($owner->can('confirm', $transfer));
    }

    public function test_group_member_managing_placements_is_allowed_owner_side_actions(): void
    {
        [$owner, $member, $transfer] = $this->groupTransferFixture();

        // The stored column names the direct owner, not the group member.
        $this->assertSame($owner->id, $transfer->from_user_id);
        $this->assertNotSame($member->id, $transfer->from_user_id);

        $this->assertTrue($member->can('view', $transfer));
        $this->assertTrue($member->can('update', $transfer));
        $this->assertTrue($member->can('cancel', $transfer));
        $this->assertTrue($member->can('reject', $transfer));
        $this->assertTrue($member->can('viewResponderProfile', $transfer));
        $this->assertFalse($member->can('confirm', $transfer));
    }

    public function test_former_owner_loses_owner_side_access_after_permanent_handover(): void
    {
        [$owner, $helper, $transfer] = $this->pendingTransferFixture();

        $this->assertTrue(
            app(TransferRequestLifecycleService::class)->confirm($transfer->fresh(), $helper)
        );

        $transfer = $transfer->fresh();

        // The audit column still names the previous owner — it is stale by design.
        $this->assertSame($owner->id, $transfer->from_user_id);

        $this->assertFalse($owner->can('view', $transfer));
        $this->assertFalse($owner->can('update', $transfer));
        $this->assertFalse($owner->can('cancel', $transfer));
        $this->assertFalse($owner->can('reject', $transfer));
        $this->assertFalse($owner->can('viewResponderProfile', $transfer));
    }

    public function test_responder_keeps_exactly_their_access_after_handover(): void
    {
        [$owner, $helper, $transfer] = $this->pendingTransferFixture();

        // Before the handover.
        $this->assertTrue($helper->can('view', $transfer));
        $this->assertTrue($helper->can('update', $transfer));
        $this->assertTrue($helper->can('cancel', $transfer));
        $this->assertTrue($helper->can('confirm', $transfer));
        $this->assertFalse($helper->can('reject', $transfer));
        $this->assertFalse($helper->can('viewResponderProfile', $transfer));

        app(TransferRequestLifecycleService::class)->confirm($transfer->fresh(), $helper);

        $transfer = $transfer->fresh();

        // After the handover the helper IS the new direct owner, so they now
        // additionally qualify via the owner side. Their to_user access is unchanged.
        $this->assertTrue($helper->can('view', $transfer));
        $this->assertTrue($helper->can('update', $transfer));
        $this->assertTrue($helper->can('cancel', $transfer));
        $this->assertTrue($helper->can('confirm', $transfer));
        $this->assertTrue($helper->can('reject', $transfer));
        $this->assertTrue($helper->can('viewResponderProfile', $transfer));
        $this->assertFalse($owner->can('viewResponderProfile', $transfer));
    }

    public function test_owner_side_fails_closed_when_pet_cannot_be_resolved(): void
    {
        [$owner, , $transfer] = $this->pendingTransferFixture();

        $transfer->setRelation('placementRequest', null);

        $this->assertFalse($owner->can('view', $transfer));
        $this->assertFalse($owner->can('update', $transfer));
        $this->assertFalse($owner->can('cancel', $transfer));
        $this->assertFalse($owner->can('reject', $transfer));
        $this->assertFalse($owner->can('viewResponderProfile', $transfer));
    }

    /**
     * @return array{User, User, TransferRequest}
     */
    private function pendingTransferFixture(): array
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);
        $pet = $this->createPetWithOwner($owner);
        $placement = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'request_type' => PlacementRequestType::PERMANENT,
            'status' => PlacementRequestStatus::PENDING_TRANSFER,
        ]);
        $response = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placement->id,
            'helper_profile_id' => $helperProfile->id,
        ]);
        $transfer = TransferRequest::factory()->create([
            'placement_request_id' => $placement->id,
            'placement_request_response_id' => $response->id,
            'from_user_id' => $owner->id,
            'to_user_id' => $helper->id,
            'status' => TransferRequestStatus::PENDING,
        ]);

        return [$owner, $helper, $transfer];
    }

    /**
     * @return array{User, User, TransferRequest}
     */
    private function groupTransferFixture(): array
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $helper = User::factory()->create();
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

        $placement = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $member->id,
            'request_type' => PlacementRequestType::PERMANENT,
            'status' => PlacementRequestStatus::PENDING_TRANSFER,
        ]);
        $response = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placement->id,
            'helper_profile_id' => HelperProfile::factory()->create(['user_id' => $helper->id])->id,
        ]);
        $transfer = TransferRequest::factory()->create([
            'placement_request_id' => $placement->id,
            'placement_request_response_id' => $response->id,
            'from_user_id' => $owner->id,
            'to_user_id' => $helper->id,
            'status' => TransferRequestStatus::PENDING,
        ]);

        return [$owner, $member, $transfer];
    }
}
