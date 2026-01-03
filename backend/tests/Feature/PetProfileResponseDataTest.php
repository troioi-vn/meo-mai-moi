<?php

namespace Tests\Feature;

use App\Models\HelperProfile;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PetProfileResponseDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_pet_profile_with_placement_request_and_transfer_request_data()
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $placementRequest = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'user_id' => $owner->id]);
        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);
        \App\Models\PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => \App\Enums\PlacementResponseStatus::RESPONDED,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/pets/{$pet->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'placement_requests' => [
                        '*' => [
                            'id',
                            'responses' => [
                                '*' => [
                                    'id',
                                    'helper_profile' => [
                                        'id',
                                        'user',
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ]);
    }

    public function test_it_returns_pet_profile_with_relationship_history()
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $editor = User::factory()->create();
        $pet->editors()->attach($editor->id, [
            'relationship_type' => \App\Enums\PetRelationshipType::EDITOR->value,
            'start_at' => now()->subDays(5),
            'created_by' => $owner->id,
        ]);

        $pastFoster = User::factory()->create();
        $pet->relationships()->create([
            'user_id' => $pastFoster->id,
            'relationship_type' => \App\Enums\PetRelationshipType::FOSTER->value,
            'start_at' => now()->subDays(20),
            'end_at' => now()->subDays(10),
            'created_by' => $owner->id,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/pets/{$pet->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'relationships' => [
                        '*' => [
                            'id',
                            'user_id',
                            'relationship_type',
                            'start_at',
                            'end_at',
                            'user' => [
                                'id',
                                'name',
                            ],
                        ],
                    ],
                ],
            ]);

        $relationships = $response->json('data.relationships');
        $this->assertCount(3, $relationships); // Owner, Editor, Past Foster
    }
}
