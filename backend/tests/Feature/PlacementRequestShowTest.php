<?php

namespace Tests\Feature;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\PlacementResponseStatus;
use App\Enums\TransferRequestStatus;
use App\Models\HelperProfile;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PlacementRequestShowTest extends TestCase
{
    use RefreshDatabase;

    protected function createPlacementRequest(Pet $pet, User $owner, string $status = 'open'): PlacementRequest
    {
        return PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::from($status),
            'request_type' => PlacementRequestType::FOSTER_FREE,
            'start_date' => now()->addDays(1),
        ]);
    }

    protected function createHelperWithResponse(PlacementRequest $placementRequest, string $status = 'responded'): array
    {
        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create([
            'user_id' => $helper->id,
            'status' => 'active',
        ]);

        $response = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => PlacementResponseStatus::from($status),
            'responded_at' => now(),
        ]);

        return ['user' => $helper, 'profile' => $helperProfile, 'response' => $response];
    }

    // ============================================================
    // GET /api/placement-requests/{id} - Show endpoint tests
    // ============================================================

    #[Test]
    public function owner_can_view_their_placement_request(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);

        $response = $this->actingAs($owner)->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $placementRequest->id)
            ->assertJsonPath('data.viewer_role', 'owner')
            ->assertJsonPath('data.pet.id', $pet->id)
            ->assertJsonPath('data.pet.name', $pet->name);
    }

    #[Test]
    public function helper_can_view_request_after_responding(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);
        $helperData = $this->createHelperWithResponse($placementRequest);

        $response = $this->actingAs($helperData['user'])->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $placementRequest->id)
            ->assertJsonPath('data.viewer_role', 'helper')
            ->assertJsonPath('data.my_response_id', $helperData['response']->id);
    }

    #[Test]
    public function helper_can_view_request_as_transfer_recipient(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner, 'pending_transfer');
        $helperData = $this->createHelperWithResponse($placementRequest, 'accepted');

        // Create transfer request
        TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'placement_request_response_id' => $helperData['response']->id,
            'from_user_id' => $owner->id,
            'to_user_id' => $helperData['user']->id,
            'status' => TransferRequestStatus::PENDING,
        ]);

        $response = $this->actingAs($helperData['user'])->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.viewer_role', 'helper')
            ->assertJsonStructure([
                'data' => [
                    'transfer_requests',
                ],
            ]);
    }

    #[Test]
    public function helper_cannot_view_unrelated_request(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner, 'pending_transfer');

        $unrelatedHelper = User::factory()->create();

        $response = $this->actingAs($unrelatedHelper)->getJson("/api/placement-requests/{$placementRequest->id}");

        // Should be forbidden since status is not open and helper is unrelated
        $response->assertForbidden();
    }

    #[Test]
    public function owner_sees_full_response_list(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);

        // Create multiple helper responses
        $this->createHelperWithResponse($placementRequest);
        $this->createHelperWithResponse($placementRequest);
        $this->createHelperWithResponse($placementRequest);

        $response = $this->actingAs($owner)->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonCount(3, 'data.responses')
            ->assertJsonPath('data.response_count', 3);
    }

    #[Test]
    public function helper_sees_only_their_response_and_accepted_response(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);

        // Create helper's own response
        $myHelperData = $this->createHelperWithResponse($placementRequest);

        // Create other helpers' responses
        $this->createHelperWithResponse($placementRequest);
        $otherAcceptedData = $this->createHelperWithResponse($placementRequest, 'accepted');

        $response = $this->actingAs($myHelperData['user'])->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.response_count', 3);

        // Helper should only see their own response and the accepted one
        $responses = $response->json('data.responses');
        $this->assertCount(2, $responses);

        $responseIds = array_column($responses, 'id');
        $this->assertContains($myHelperData['response']->id, $responseIds);
        $this->assertContains($otherAcceptedData['response']->id, $responseIds);
    }

    #[Test]
    public function anonymous_user_can_view_open_request(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);

        // Create some responses
        $this->createHelperWithResponse($placementRequest);
        $this->createHelperWithResponse($placementRequest);

        $response = $this->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $placementRequest->id)
            ->assertJsonPath('data.viewer_role', 'public')
            ->assertJsonPath('data.response_count', 2)
            ->assertJsonCount(0, 'data.responses'); // No individual responses for public
    }

    #[Test]
    public function anonymous_user_cannot_view_non_open_request(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner, 'pending_transfer');

        $response = $this->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertForbidden();
    }

    #[Test]
    public function response_includes_available_actions_for_owner(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);

        $response = $this->actingAs($owner)->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.available_actions.can_accept_responses', true)
            ->assertJsonPath('data.available_actions.can_reject_responses', true)
            ->assertJsonPath('data.available_actions.can_delete_request', true)
            ->assertJsonPath('data.available_actions.can_respond', false); // Owner can't respond
    }

    #[Test]
    public function response_includes_available_actions_for_helper(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);
        $helperData = $this->createHelperWithResponse($placementRequest);

        $response = $this->actingAs($helperData['user'])->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.available_actions.can_cancel_my_response', true)
            ->assertJsonPath('data.available_actions.can_accept_responses', false)
            ->assertJsonPath('data.available_actions.can_respond', false); // Already responded
    }

    #[Test]
    public function response_includes_pet_snapshot(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);

        $response = $this->actingAs($owner)->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'pet' => [
                        'id',
                        'name',
                        'pet_type',
                    ],
                ],
            ]);
    }

    // ============================================================
    // GET /api/placement-requests/{id}/me - Viewer context tests
    // ============================================================

    #[Test]
    public function me_endpoint_returns_viewer_context_for_owner(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);

        $response = $this->actingAs($owner)->getJson("/api/placement-requests/{$placementRequest->id}/me");

        $response->assertOk()
            ->assertJsonPath('data.viewer_role', 'owner')
            ->assertJsonPath('data.my_response', null)
            ->assertJsonPath('data.my_response_id', null)
            ->assertJsonStructure([
                'data' => [
                    'available_actions' => [
                        'can_respond',
                        'can_cancel_my_response',
                        'can_accept_responses',
                        'can_reject_responses',
                        'can_confirm_handover',
                        'can_finalize',
                        'can_delete_request',
                    ],
                ],
            ]);
    }

    #[Test]
    public function me_endpoint_returns_viewer_context_for_helper(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);
        $helperData = $this->createHelperWithResponse($placementRequest);

        $response = $this->actingAs($helperData['user'])->getJson("/api/placement-requests/{$placementRequest->id}/me");

        $response->assertOk()
            ->assertJsonPath('data.viewer_role', 'helper')
            ->assertJsonPath('data.my_response_id', $helperData['response']->id)
            ->assertJsonStructure([
                'data' => [
                    'my_response' => [
                        'id',
                        'status',
                        'message',
                    ],
                ],
            ]);
    }

    #[Test]
    public function me_endpoint_returns_transfer_info_for_accepted_helper(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner, 'pending_transfer');
        $helperData = $this->createHelperWithResponse($placementRequest, 'accepted');

        $transfer = TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'placement_request_response_id' => $helperData['response']->id,
            'from_user_id' => $owner->id,
            'to_user_id' => $helperData['user']->id,
            'status' => TransferRequestStatus::PENDING,
        ]);

        $response = $this->actingAs($helperData['user'])->getJson("/api/placement-requests/{$placementRequest->id}/me");

        $response->assertOk()
            ->assertJsonPath('data.my_transfer.id', $transfer->id)
            ->assertJsonPath('data.my_transfer.status', 'pending')
            ->assertJsonPath('data.available_actions.can_confirm_handover', true);
    }

    #[Test]
    public function me_endpoint_requires_authentication(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);

        $response = $this->getJson("/api/placement-requests/{$placementRequest->id}/me");

        $response->assertUnauthorized();
    }

    #[Test]
    public function finalize_action_available_for_active_temporary_placement(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::ACTIVE,
            'request_type' => PlacementRequestType::FOSTER_FREE, // Temporary type
            'start_date' => now()->subDays(1),
        ]);

        $response = $this->actingAs($owner)->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.available_actions.can_finalize', true);
    }

    #[Test]
    public function finalize_action_not_available_for_permanent_placement(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::ACTIVE,
            'request_type' => PlacementRequestType::PERMANENT, // Not temporary
            'start_date' => now()->subDays(1),
        ]);

        $response = $this->actingAs($owner)->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.available_actions.can_finalize', false);
    }

    // ============================================================
    // can_respond action tests
    // ============================================================

    #[Test]
    public function potential_helper_with_profile_can_respond_to_open_request(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);

        // Create a potential helper with an active helper profile (but no response yet)
        $potentialHelper = User::factory()->create();
        HelperProfile::factory()->create([
            'user_id' => $potentialHelper->id,
            'status' => 'active',
        ]);

        $response = $this->actingAs($potentialHelper)->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.viewer_role', 'public') // Not yet a helper for this request
            ->assertJsonPath('data.available_actions.can_respond', true);
    }

    #[Test]
    public function potential_helper_without_profile_cannot_respond(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);

        // Create a user without a helper profile
        $userWithoutProfile = User::factory()->create();

        $response = $this->actingAs($userWithoutProfile)->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.viewer_role', 'public')
            ->assertJsonPath('data.available_actions.can_respond', false);
    }

    #[Test]
    public function potential_helper_with_archived_profile_cannot_respond(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);

        // Create a potential helper with an archived helper profile (not active)
        $potentialHelper = User::factory()->create();
        HelperProfile::factory()->create([
            'user_id' => $potentialHelper->id,
            'status' => 'archived',
        ]);

        $response = $this->actingAs($potentialHelper)->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.available_actions.can_respond', false);
    }

    #[Test]
    public function helper_who_already_responded_cannot_respond_again(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);
        $helperData = $this->createHelperWithResponse($placementRequest, 'responded');

        $response = $this->actingAs($helperData['user'])->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.viewer_role', 'helper')
            ->assertJsonPath('data.available_actions.can_respond', false);
    }

    #[Test]
    public function helper_whose_response_was_rejected_cannot_respond_again(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);
        $helperData = $this->createHelperWithResponse($placementRequest, 'rejected');

        $response = $this->actingAs($helperData['user'])->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.viewer_role', 'helper')
            ->assertJsonPath('data.available_actions.can_respond', false);
    }

    #[Test]
    public function potential_helper_cannot_respond_to_non_open_request(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner, 'pending_transfer');

        // Create a potential helper with an active helper profile
        $potentialHelper = User::factory()->create();
        HelperProfile::factory()->create([
            'user_id' => $potentialHelper->id,
            'status' => 'active',
        ]);

        // This request should be forbidden since it's not open and helper is unrelated
        $response = $this->actingAs($potentialHelper)->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertForbidden();
    }

    #[Test]
    public function anonymous_user_sees_can_respond_false(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = $this->createPlacementRequest($pet, $owner);

        $response = $this->getJson("/api/placement-requests/{$placementRequest->id}");

        $response->assertOk()
            ->assertJsonPath('data.viewer_role', 'public')
            ->assertJsonPath('data.available_actions.can_respond', false);
    }
}
