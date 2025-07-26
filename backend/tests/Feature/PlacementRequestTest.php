<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\User;
use App\Enums\PlacementRequestType;
use App\Models\PlacementRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlacementRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_placement_request_with_date_expires_at(): void
    {
        $user = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $user->id]);
        $this->actingAs($user);

        $data = [
            'cat_id' => $cat->id,
            'request_type' => PlacementRequestType::PERMANENT->value,
            'notes' => 'Test notes',
            'expires_at' => now()->addDays(10)->toDateString(),
        ];

        $response = $this->postJson('/api/placement-requests', $data);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'expires_at' => $data['expires_at'],
            ]);

        $placementRequest = PlacementRequest::first();
        $this->assertNotNull($placementRequest);
        $this->assertEquals($data['expires_at'], $placementRequest->expires_at->toDateString());
    }
}
