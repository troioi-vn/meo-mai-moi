<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\HelperProfile;
use App\Models\PlacementRequest;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CatProfileResponseDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_cat_profile_with_placement_request_and_transfer_request_data()
    {
        $owner = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        $placementRequest = PlacementRequest::factory()->create(['cat_id' => $cat->id, 'user_id' => $owner->id]);
        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);
        TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'requester_id' => $helper->id,
        ]);

        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/cats/{$cat->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'placement_requests' => [
                        '*' => [
                            'id',
                            'transfer_requests' => [
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
}