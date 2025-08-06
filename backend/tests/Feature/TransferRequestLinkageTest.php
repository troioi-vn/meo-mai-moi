<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\PlacementRequest;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class TransferRequestLinkageTest extends TestCase
{
    use RefreshDatabase;

    // #[Test]
    // public function test_transfer_request_can_be_linked_to_placement_request(): void
    // {
    //     $cat = Cat::factory()->create();
    //     $placementRequest = PlacementRequest::factory()->create(['cat_id' => $cat->id]);
    //     $transferRequest = TransferRequest::factory()->create([
    //         'cat_id' => $cat->id,
    //         'placement_request_id' => $placementRequest->id,
    //     ]);

    //     $this->assertDatabaseHas('transfer_requests', [
    //         'id' => $transferRequest->id,
    //         'placement_request_id' => $placementRequest->id,
    //     ]);

    //     $this->assertInstanceOf(PlacementRequest::class, $transferRequest->placementRequest);
    //     $this->assertEquals($placementRequest->id, $transferRequest->placementRequest->id);
    // }
}
