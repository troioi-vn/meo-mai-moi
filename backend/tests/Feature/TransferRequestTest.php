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
    public function test_helper_can_initiate_transfer_request()
    {
        $helper = User::factory()->create(['role' => \App\Enums\UserRole::HELPER]);
        $catOwner = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $catOwner->id, 'status' => 'available']);

        $response = $this->actingAs($helper)->postJson("/api/transfer-requests", [
            'cat_id' => $cat->id,
            'requested_relationship_type' => 'fostering',
            'fostering_type' => 'free',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('transfer_requests', [
            'cat_id' => $cat->id,
            'initiator_user_id' => $helper->id,
            'recipient_user_id' => $catOwner->id,
            'status' => 'pending',
            'requested_relationship_type' => 'fostering',
            'fostering_type' => 'free',
        ]);

        // Assert notification is created for the cat owner
        $this->assertDatabaseHas('notifications', [
            'user_id' => $catOwner->id,
            'message' => 'New transfer request for your cat: ' . $cat->name,
            'link' => '/account/transfer-requests/' . $response->json('id'),
            'is_read' => false,
        ]);
    }

    #[Test]
    public function test_non_helper_cannot_initiate_transfer_request()
    {
        $catOwner = User::factory()->create(['role' => \App\Enums\UserRole::CAT_OWNER]);
        $cat = Cat::factory()->create(['user_id' => $catOwner->id, 'status' => 'available']);

        $response = $this->actingAs($catOwner)->postJson("/api/transfer-requests", [
            'cat_id' => $cat->id,
            'requested_relationship_type' => 'fostering',
            'fostering_type' => 'free',
        ]);

        $response->assertForbidden();
    }

    #[Test]
    public function test_helper_cannot_initiate_transfer_request_for_unavailable_cat()
    {
        $helper = User::factory()->create(['role' => \App\Enums\UserRole::HELPER]);
        $catOwner = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $catOwner->id, 'status' => 'adopted']); // Cat is adopted

        $response = $this->actingAs($helper)->postJson("/api/transfer-requests", [
            'cat_id' => $cat->id,
            'requested_relationship_type' => 'fostering',
            'fostering_type' => 'free',
        ]);

        $response->assertForbidden();
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
