<?php

namespace Tests\Unit;

use App\Enums\PetRelationshipType;
use App\Http\Controllers\TransferHandover\CompleteHandoverController;
use App\Models\HelperProfile;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\TransferHandover;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class TransferHandoverCompletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_complete_handover_closes_previous_and_opens_new_history(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        // Pet already has ownership relationship from createPetWithOwner helper

        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);
        $tr = TransferRequest::create([
            'pet_id' => $pet->id,
            'initiator_user_id' => $helper->id,
            'recipient_user_id' => $owner->id,
            'requester_id' => $helper->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => 'accepted',
            'requested_relationship_type' => 'permanent_foster',
        ]);

        $handover = TransferHandover::create([
            'transfer_request_id' => $tr->id,
            'owner_user_id' => $owner->id,
            'helper_user_id' => $helper->id,
            'status' => 'confirmed',
        ]);

        // Act as either party (owner) to complete
        $controller = app(CompleteHandoverController::class);
        $request = Request::create('/', 'POST');
        $request->setUserResolver(fn () => $owner);
        $response = $controller($request, $handover);

        $responseData = $response->getData(true)['data'] ?? null;
        $this->assertNotNull($responseData);

        $pet->refresh();
        $this->assertPetOwnedBy($pet, $helper);

        $prev = PetRelationship::where('pet_id', $pet->id)
            ->where('user_id', $owner->id)
            ->where('relationship_type', PetRelationshipType::OWNER->value)
            ->whereNotNull('end_at')
            ->orderByDesc('id')
            ->first();
        $this->assertNotNull($prev);
        $this->assertNotNull($prev->end_at, 'Previous owner relationship should be ended');

        $new = PetRelationship::where('pet_id', $pet->id)
            ->where('user_id', $helper->id)
            ->where('relationship_type', PetRelationshipType::OWNER->value)
            ->whereNull('end_at')
            ->first();
        $this->assertNotNull($new, 'New owner should have an active relationship');
    }

    public function test_complete_handover_backfills_when_no_previous_open_history(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        // Test scenario where ownership transfer happens without existing relationship data

        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);
        $tr = TransferRequest::create([
            'pet_id' => $pet->id,
            'initiator_user_id' => $helper->id,
            'recipient_user_id' => $owner->id,
            'requester_id' => $helper->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => 'accepted',
            'requested_relationship_type' => 'permanent_foster',
        ]);

        $handover = TransferHandover::create([
            'transfer_request_id' => $tr->id,
            'owner_user_id' => $owner->id,
            'helper_user_id' => $helper->id,
            'status' => 'pending',
        ]);

        $controller = app(CompleteHandoverController::class);
        $request = Request::create('/', 'POST');
        $request->setUserResolver(fn () => $helper);
        $controller($request, $handover);

        $pet->refresh();
        $this->assertPetOwnedBy($pet, $helper);

        // previous owner should now have a closed relationship
        $prev = PetRelationship::where('pet_id', $pet->id)
            ->where('user_id', $owner->id)
            ->where('relationship_type', PetRelationshipType::OWNER->value)
            ->whereNotNull('end_at')
            ->orderByDesc('id')
            ->first();
        $this->assertNotNull($prev);
        $this->assertNotNull($prev->end_at);

        // new owner should have an active relationship
        $new = PetRelationship::where('pet_id', $pet->id)
            ->where('user_id', $helper->id)
            ->where('relationship_type', PetRelationshipType::OWNER->value)
            ->whereNull('end_at')
            ->first();
        $this->assertNotNull($new);
    }
}
