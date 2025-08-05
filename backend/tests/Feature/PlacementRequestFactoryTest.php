<?php

namespace Tests\Feature;

use App\Models\PlacementRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class PlacementRequestFactoryTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_placement_request_factory_creates_is_active_column(): void
    {
        $placementRequest = PlacementRequest::factory()->create();

        $this->assertDatabaseHas('placement_requests', [
            'id' => $placementRequest->id,
            'is_active' => true,
        ]);
    }
}
