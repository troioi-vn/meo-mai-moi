<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Models\HelperProfile;
use App\Models\NotificationPreference;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;
use Tests\Traits\CreatesUsers;

class EmailNotificationIntegrationTest extends TestCase
{
    use CreatesUsers;
    use RefreshDatabase;

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
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => \App\Enums\PlacementRequestStatus::OPEN,
        ]);
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        // Enable email notifications for the owner
        NotificationPreference::create([
            'user_id' => $owner->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        // Create placement response (this should trigger notification)
        $response = $this->actingAs($helper)->postJson("/api/placement-requests/{$placementRequest->id}/responses", [
            'message' => 'I want to help!',
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
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => \App\Enums\PlacementRequestStatus::OPEN,
        ]);
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        // Create placement response
        $placementResponse = \App\Models\PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => \App\Enums\PlacementResponseStatus::RESPONDED,
        ]);

        // Enable email notifications for the helper
        NotificationPreference::create([
            'user_id' => $helper->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        // Accept the response (this should trigger notification)
        $response = $this->actingAs($owner)->postJson("/api/placement-responses/{$placementResponse->id}/accept");

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
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => \App\Enums\PetStatus::ACTIVE]);
        $placementRequest = PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => \App\Enums\PlacementRequestStatus::OPEN,
        ]);
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);

        // Create placement response
        $placementResponse = \App\Models\PlacementRequestResponse::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'status' => \App\Enums\PlacementResponseStatus::RESPONDED,
        ]);

        // Enable email notifications for the helper
        NotificationPreference::create([
            'user_id' => $helper->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_REJECTED->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        // Reject the response (this should trigger notification)
        $response = $this->actingAs($owner)->postJson("/api/placement-responses/{$placementResponse->id}/reject");

        $response->assertStatus(200);

        // Verify notification was created
        $this->assertDatabaseHas('notifications', [
            'user_id' => $helper->id,
            'type' => NotificationType::HELPER_RESPONSE_REJECTED->value,
        ]);
    }
}
