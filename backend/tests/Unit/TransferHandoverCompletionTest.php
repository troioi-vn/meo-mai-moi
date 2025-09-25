<?php

namespace Tests\Unit;

use App\Http\Controllers\TransferHandoverController;
use App\Models\Pet;
use App\Models\OwnershipHistory;
use App\Models\TransferHandover;
use App\Models\TransferRequest;
use App\Models\User;
use App\Models\HelperProfile;
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
    $pet = Pet::factory()->create(['user_id' => $owner->id]);

        // Existing open history for owner
        OwnershipHistory::create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'from_ts' => now()->subDays(5),
            'to_ts' => null,
        ]);

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
    $controller = app(TransferHandoverController::class);
    $request = Request::create('/','POST');
    $request->setUserResolver(fn()=> $owner);
    $response = $controller->complete($request, $handover);

        $responseData = $response->getData(true)['data'] ?? null;
        $this->assertNotNull($responseData);

    $pet->refresh();
    $this->assertEquals($helper->id, $pet->user_id, 'Pet owner should now be helper');

    $prev = OwnershipHistory::where('pet_id', $pet->id)->where('user_id', $owner->id)->orderByDesc('id')->first();
        $this->assertNotNull($prev);
        $this->assertNotNull($prev->to_ts, 'Previous owner period should be closed');

    $new = OwnershipHistory::where('pet_id', $pet->id)->where('user_id', $helper->id)->whereNull('to_ts')->first();
        $this->assertNotNull($new, 'New owner should have an open period');
    }

    public function test_complete_handover_backfills_when_no_previous_open_history(): void
    {
        $owner = User::factory()->create();
        $helper = User::factory()->create();
    $pet = Pet::factory()->create(['user_id' => $owner->id]);

        // Intentionally no open OwnershipHistory for owner (simulate legacy data)

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

    $controller = app(TransferHandoverController::class);
    $request = Request::create('/','POST');
    $request->setUserResolver(fn()=> $helper);
    $controller->complete($request, $handover);

    $pet->refresh();
    $this->assertEquals($helper->id, $pet->user_id);

        // previous owner should now have a closed backfilled period
    $prev = OwnershipHistory::where('pet_id', $pet->id)->where('user_id', $owner->id)->orderByDesc('id')->first();
        $this->assertNotNull($prev);
        $this->assertNotNull($prev->to_ts);

        // new owner should have an open period
    $new = OwnershipHistory::where('pet_id', $pet->id)->where('user_id', $helper->id)->whereNull('to_ts')->first();
        $this->assertNotNull($new);
    }
}
