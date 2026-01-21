<?php

namespace Tests\Feature;

use App\Models\HelperProfile;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TransferRequestLinkageTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_transfer_request_can_be_linked_to_placement_request(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);
        $pet = Pet::factory()->create(['created_by' => $owner->id]);
        $placementRequest = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'user_id' => $owner->id]);
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

        $this->assertDatabaseHas('transfer_requests', [
            'id' => $transferRequest->id,
            'placement_request_id' => $placementRequest->id,
        ]);

        $this->assertInstanceOf(PlacementRequest::class, $transferRequest->placementRequest);
        $this->assertEquals($placementRequest->id, $transferRequest->placementRequest->id);
    }
}
