<?php

namespace Tests\Unit\Policies;

use App\Enums\PlacementRequestStatus;
use App\Enums\TransferRequestStatus;
use App\Models\HelperProfile;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransferRequestPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_helper_can_confirm_transfer_request(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);
        $pet = $this->createPetWithOwner($owner);
        $placement = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'user_id' => $owner->id, 'status' => PlacementRequestStatus::PENDING_TRANSFER]);
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

        $this->actingAs($helper);
        $this->assertTrue($helper->can('confirm', $transfer));
    }

    public function test_owner_can_reject_transfer_request(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);
        $pet = $this->createPetWithOwner($owner);
        $placement = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'user_id' => $owner->id, 'status' => PlacementRequestStatus::PENDING_TRANSFER]);
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

        $this->actingAs($owner);
        $this->assertTrue($owner->can('reject', $transfer));
    }

    public function test_non_participant_cannot_confirm_or_reject_transfer_request(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $other = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);
        $pet = $this->createPetWithOwner($owner);
        $placement = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'user_id' => $owner->id, 'status' => PlacementRequestStatus::PENDING_TRANSFER]);
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

        $this->actingAs($other);
        $this->assertFalse($other->can('confirm', $transfer));
        $this->assertFalse($other->can('reject', $transfer));
    }

    public function test_owner_cannot_confirm_only_helper_can(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);
        $pet = $this->createPetWithOwner($owner);
        $placement = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'user_id' => $owner->id, 'status' => PlacementRequestStatus::PENDING_TRANSFER]);
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

        $this->actingAs($owner);
        // Owner cannot confirm - only the recipient (helper) can
        $this->assertFalse($owner->can('confirm', $transfer));
    }
}
