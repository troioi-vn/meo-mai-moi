<?php

namespace Tests\Feature;

use App\Models\PlacementRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PlacementRequestFactoryTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_placement_request_factory_creates_with_open_status(): void
    {
        $placementRequest = PlacementRequest::factory()->create();

        $this->assertDatabaseHas('placement_requests', [
            'id' => $placementRequest->id,
            'status' => 'open',
        ]);

        $this->assertTrue($placementRequest->isActive());
    }
}
