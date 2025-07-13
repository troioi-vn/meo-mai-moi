<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class TransferRequestTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function test_cat_owner_can_initiate_transfer_request()
    {
        $owner = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        $recipient = User::factory()->create();

        $response = $this->actingAs($owner)->postJson("/api/cats/{$cat->id}/transfer-request", [
            'recipient_user_id' => $recipient->id,
            'requested_relationship_type' => 'fostering',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('transfer_requests', [
            'cat_id' => $cat->id,
            'initiator_user_id' => $owner->id,
            'recipient_user_id' => $recipient->id,
            'status' => 'pending',
            'requested_relationship_type' => 'fostering',
        ]);
    }

    #[Test]
    public function test_recipient_can_accept_transfer_request()
    {
        $owner = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        $recipient = User::factory()->create();
        $transferRequest = TransferRequest::factory()->create([
            'cat_id' => $cat->id,
            'initiator_user_id' => $owner->id,
            'recipient_user_id' => $recipient->id,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($recipient)->postJson("/api/transfer-requests/{$transferRequest->id}/accept");

        $response->assertOk();
        $this->assertDatabaseHas('transfer_requests', [
            'id' => $transferRequest->id,
            'status' => 'accepted',
        ]);
        // Assert that cat's user_id is updated to recipient's user_id
        $this->assertEquals($recipient->id, $cat->fresh()->user_id);
    }

    #[Test]
    public function test_recipient_can_reject_transfer_request()
    {
        $owner = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        $recipient = User::factory()->create();
        $transferRequest = TransferRequest::factory()->create([
            'cat_id' => $cat->id,
            'initiator_user_id' => $owner->id,
            'recipient_user_id' => $recipient->id,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($recipient)->postJson("/api/transfer-requests/{$transferRequest->id}/reject");

        $response->assertOk();
        $this->assertDatabaseHas('transfer_requests', [
            'id' => $transferRequest->id,
            'status' => 'rejected',
        ]);
        // Assert that cat's user_id is NOT updated
        $this->assertEquals($owner->id, $cat->fresh()->user_id);
    }

    #[Test]
    public function test_non_recipient_cannot_act_on_transfer_request()
    {
        $owner = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        $recipient = User::factory()->create();
        $nonRecipient = User::factory()->create();
        $transferRequest = TransferRequest::factory()->create([
            'cat_id' => $cat->id,
            'initiator_user_id' => $owner->id,
            'recipient_user_id' => $recipient->id,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($nonRecipient)->postJson("/api/transfer-requests/{$transferRequest->id}/accept");
        $response->assertForbidden();

        $response = $this->actingAs($nonRecipient)->postJson("/api/transfer-requests/{$transferRequest->id}/reject");
        $response->assertForbidden();
    }
}
