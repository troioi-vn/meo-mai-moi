<?php

namespace Tests\Feature\Http\Controllers;

use App\Models\Cat;
use App\Models\User;
use App\Models\PlacementRequest;
use App\Enums\PlacementRequestType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Laravel\Sanctum\Sanctum;

class PlacementRequestControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_placement_request()
    {
        $user = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $user->id]);
        Sanctum::actingAs($user);

        $requestData = [
            'cat_id' => $cat->id,
            'request_type' => PlacementRequestType::PERMANENT->value,
            'notes' => 'Looking for a new home.',
        ];

        $response = $this->postJson('/api/placement-requests', $requestData);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['id', 'cat_id', 'request_type']])
            ->assertJsonFragment($requestData);

        $this->assertDatabaseHas('placement_requests', $requestData);
    }

    public function test_non_owner_cannot_create_placement_request()
    {
        $owner = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        $nonOwner = User::factory()->create();
        Sanctum::actingAs($nonOwner);

        $requestData = [
            'cat_id' => $cat->id,
            'request_type' => PlacementRequestType::PERMANENT->value,
        ];

        $response = $this->postJson('/api/placement-requests', $requestData);

        $response->assertStatus(403);
    }

    public function test_cannot_create_duplicate_active_placement_request()
    {
        $user = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $user->id]);
        Sanctum::actingAs($user);

        PlacementRequest::factory()->create([
            'cat_id' => $cat->id,
            'user_id' => $user->id,
            'request_type' => PlacementRequestType::PERMANENT->value,
            'status' => 'open',
        ]);

        $requestData = [
            'cat_id' => $cat->id,
            'request_type' => PlacementRequestType::PERMANENT->value,
        ];

        $response = $this->postJson('/api/placement-requests', $requestData);

        $response->assertStatus(409);
    }

    public function test_create_placement_request_validation()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/placement-requests', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['cat_id', 'request_type']);
    }
}