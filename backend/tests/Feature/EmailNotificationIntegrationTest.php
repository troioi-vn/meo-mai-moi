<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Models\HelperProfile;
use App\Models\NotificationPreference;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;
use Tests\Traits\CreatesUsers;

class EmailNotificationIntegrationTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
    }

    public function test_placement_request_response_triggers_email_notification()
    {
        // Create users
        $owner = User::factory()->create();
        $helper = User::factory()->create();

        // Create pet and placement request
        $pet = Pet::factory()->create(['user_id' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'is_active' => true,
            'status' => \App\Enums\PlacementRequestStatus::OPEN->value,
        ]);
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        // Enable email notifications for the owner
        NotificationPreference::create([
            'user_id' => $owner->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        // Create transfer request (this should trigger notification)
        $response = $this->actingAs($helper)->postJson('/api/transfer-requests', [
            'pet_id' => $pet->id,
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'requested_relationship_type' => 'fostering',
            'fostering_type' => 'free',
        ]);

        $response->assertStatus(201);

        // Verify notification was created
        $this->assertDatabaseHas('notifications', [
            'user_id' => $owner->id,
            'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
        ]);
    }

    public function test_helper_response_accepted_triggers_email_notification()
    {
        // Create users
        $owner = User::factory()->create();
        $helper = User::factory()->create();

        // Create pet and placement request
        $pet = Pet::factory()->create(['user_id' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'is_active' => true,
            'status' => \App\Enums\PlacementRequestStatus::OPEN->value,
        ]);
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        // Create transfer request
        $transferRequest = TransferRequest::factory()->create([
            'pet_id' => $pet->id,
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'initiator_user_id' => $helper->id,
            'recipient_user_id' => $owner->id,
            'requester_id' => $helper->id,
            'status' => 'pending',
        ]);

        // Enable email notifications for the helper
        NotificationPreference::create([
            'user_id' => $helper->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        // Accept the transfer request (this should trigger notification)
        $response = $this->actingAs($owner)->postJson("/api/transfer-requests/{$transferRequest->id}/accept");

        $response->assertStatus(200);

        // Verify notification was created
        $this->assertDatabaseHas('notifications', [
            'user_id' => $helper->id,
            'type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
        ]);
    }

    public function test_helper_response_rejected_triggers_email_notification()
    {
        // Create users
        $owner = User::factory()->create();
        $helper = User::factory()->create();

        // Create pet and placement request
        $pet = Pet::factory()->create(['user_id' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'is_active' => true,
            'status' => \App\Enums\PlacementRequestStatus::OPEN->value,
        ]);
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        // Create transfer request
        $transferRequest = TransferRequest::factory()->create([
            'pet_id' => $pet->id,
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'initiator_user_id' => $helper->id,
            'recipient_user_id' => $owner->id,
            'requester_id' => $helper->id,
            'status' => 'pending',
        ]);

        // Enable email notifications for the helper
        NotificationPreference::create([
            'user_id' => $helper->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_REJECTED->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        // Reject the transfer request (this should trigger notification)
        $response = $this->actingAs($owner)->postJson("/api/transfer-requests/{$transferRequest->id}/reject");

        $response->assertStatus(200);

        // Verify notification was created
        $this->assertDatabaseHas('notifications', [
            'user_id' => $helper->id,
            'type' => NotificationType::HELPER_RESPONSE_REJECTED->value,
        ]);
    }
}
