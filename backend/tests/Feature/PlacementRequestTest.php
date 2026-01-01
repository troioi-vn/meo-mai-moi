<?php

namespace Tests\Feature;

use App\Enums\PlacementRequestType;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PlacementRequestTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function can_create_placement_request_with_start_and_end_dates(): void
    {
        $user = User::factory()->create();
        $petType = PetType::factory()->create(['placement_requests_allowed' => true]);
        $pet = Pet::factory()->create(['created_by' => $user->id, 'pet_type_id' => $petType->id]);
        $this->actingAs($user);

        $data = [
            'pet_id' => $pet->id,
            'request_type' => PlacementRequestType::PERMANENT->value,
            'notes' => 'Test notes',
            'start_date' => now()->addDays(5)->toDateString(),
            'end_date' => now()->addDays(15)->toDateString(),
        ];

        $response = $this->postJson('/api/placement-requests', $data);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
            ]);

        $placementRequest = PlacementRequest::first();
        $this->assertNotNull($placementRequest);
        $this->assertEquals($data['start_date'], $placementRequest->start_date->toDateString());
        $this->assertEquals($data['end_date'], $placementRequest->end_date->toDateString());
    }

    #[Test]
    public function can_create_placement_request_with_date_expires_at(): void
    {
        $user = User::factory()->create();
        $petType = PetType::factory()->create(['placement_requests_allowed' => true]);
        $pet = Pet::factory()->create(['created_by' => $user->id, 'pet_type_id' => $petType->id]);
        $this->actingAs($user);

        $data = [
            'pet_id' => $pet->id,
            'request_type' => PlacementRequestType::PERMANENT->value,
            'notes' => 'Test notes',
            'start_date' => now()->addDays(1)->toDateString(),
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
