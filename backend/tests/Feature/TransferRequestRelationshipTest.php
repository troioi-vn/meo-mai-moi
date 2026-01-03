<?php

namespace Tests\Feature;

use App\Models\HelperProfile;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TransferRequestRelationshipTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function a_transfer_request_belongs_to_a_placement_request()
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'user_id' => $owner->id]);
        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);
        $placementResponse = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
        ]);

        $transferRequest = TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'placement_request_response_id' => $placementResponse->id,
            'from_user_id' => $owner->id,
            'to_user_id' => $helper->id,
        ]);

        $this->assertInstanceOf(PlacementRequest::class, $transferRequest->placementRequest);
        $this->assertEquals($placementRequest->id, $transferRequest->placementRequest->id);
    }

    #[Test]
    public function a_placement_request_can_have_many_transfer_requests()
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'user_id' => $owner->id]);
        $helper1 = User::factory()->create();
        $helperProfile1 = HelperProfile::factory()->create(['user_id' => $helper1->id]);
        $helper2 = User::factory()->create();
        $helperProfile2 = HelperProfile::factory()->create(['user_id' => $helper2->id]);

        // Create two different placement requests from the same owner
        $pet2 = $this->createPetWithOwner($owner);
        $placementRequest2 = PlacementRequest::factory()->create(['pet_id' => $pet2->id, 'user_id' => $owner->id]);

        $placementResponse1 = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile1->id,
        ]);
        $placementResponse2 = PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest2->id,
            'helper_profile_id' => $helperProfile2->id,
        ]);

        // Create transfer requests for different placement requests from the same user
        TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'placement_request_response_id' => $placementResponse1->id,
            'from_user_id' => $owner->id,
            'to_user_id' => $helper1->id,
        ]);

        TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest2->id,
            'placement_request_response_id' => $placementResponse2->id,
            'from_user_id' => $owner->id,
            'to_user_id' => $helper2->id,
        ]);

        // Test that each placement request has its transfer request
        $this->assertCount(1, $placementRequest->transferRequests);
        $this->assertCount(1, $placementRequest2->transferRequests);
        $this->assertInstanceOf(TransferRequest::class, $placementRequest->transferRequests->first());
        $this->assertInstanceOf(TransferRequest::class, $placementRequest2->transferRequests->first());
    }
}
