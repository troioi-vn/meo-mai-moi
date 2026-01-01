<?php

namespace Tests\Feature;

use App\Models\HelperProfile;
use App\Models\PlacementRequest;
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

        $transferRequest = TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'requester_id' => $helper->id,
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

        TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile1->id,
            'requester_id' => $helper1->id,
        ]);

        TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile2->id,
            'requester_id' => $helper2->id,
        ]);

        $this->assertCount(2, $placementRequest->transferRequests);
        $this->assertInstanceOf(TransferRequest::class, $placementRequest->transferRequests->first());
    }
}
