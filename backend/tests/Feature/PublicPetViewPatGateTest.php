<?php

declare(strict_types=1);

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

class PublicPetViewPatGateTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function anonymous_callers_can_still_view_a_public_pet(): void
    {
        $pet = Pet::factory()->create(['status' => 'lost', 'name' => 'Lost Pet']);

        $this->getJson("/api/pets/{$pet->id}/view")
            ->assertOk()
            ->assertJsonPath('data.name', 'Lost Pet');
    }

    #[Test]
    public function bearer_token_with_pets_read_can_view_a_public_pet(): void
    {
        $user = User::factory()->create();
        $pet = Pet::factory()->create(['status' => 'lost']);
        $token = $user->createToken('pets read', ['pets:read'])->plainTextToken;

        $this->withToken($token)->getJson("/api/pets/{$pet->id}/view")->assertOk();
    }

    #[Test]
    public function bearer_token_without_pets_read_is_refused_on_view_route(): void
    {
        $user = User::factory()->create();
        $pet = Pet::factory()->create(['status' => 'lost']);
        $token = $user->createToken('wrong scope', ['messages:read'])->plainTextToken;

        $this->withToken($token)->getJson("/api/pets/{$pet->id}/view")->assertForbidden();
    }

    #[Test]
    public function bearer_token_without_placement_read_is_refused_on_responder_profile(): void
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

        $token = $owner->createToken('wrong scope', ['messages:read'])->plainTextToken;

        $this->withToken($token)
            ->getJson("/api/transfer-requests/{$transferRequest->id}/responder-profile")
            ->assertForbidden();
    }
}
