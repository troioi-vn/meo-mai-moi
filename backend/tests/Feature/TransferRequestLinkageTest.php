<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\TransferRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TransferRequestLinkageTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_transfer_request_can_be_linked_to_placement_request(): void
    {
        $pet = Pet::factory()->create();
        $placementRequest = PlacementRequest::factory()->create(['pet_id' => $pet->id]);
        $transferRequest = TransferRequest::factory()->create([
            'pet_id' => $pet->id,
            'placement_request_id' => $placementRequest->id,
        ]);

        $this->assertDatabaseHas('transfer_requests', [
            'id' => $transferRequest->id,
            'placement_request_id' => $placementRequest->id,
        ]);

        $this->assertInstanceOf(PlacementRequest::class, $transferRequest->placementRequest);
        $this->assertEquals($placementRequest->id, $transferRequest->placementRequest->id);
    }
}
