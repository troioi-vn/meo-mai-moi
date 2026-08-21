<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\HelperProfileCreatedVia;
use App\Enums\HelperProfileStatus;
use App\Enums\NotificationType;
use App\Enums\PetStatus;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\PlacementResponseStatus;
use App\Models\HelperProfile;
use App\Models\Notification;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Answering a placement request without building a helper profile first.
 *
 * Every request_type here is pinned. PlacementRequestFactory picks one at
 * random, and quick eligibility depends on it, so an unpinned type makes any
 * test in this file a coin flip.
 */
class PlacementQuickResponseTest extends TestCase
{
    use RefreshDatabase;

    private function openRequest(PlacementRequestType $type, ?User $owner = null): PlacementRequest
    {
        $owner ??= User::factory()->create();
        $pet = Pet::factory()->create(['created_by' => $owner->id, 'status' => PetStatus::ACTIVE]);

        return PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $owner->id,
            'status' => PlacementRequestStatus::OPEN,
            'request_type' => $type,
        ]);
    }

    #[Test]
    public function permanent_request_can_be_answered_without_a_profile(): void
    {
        $placementRequest = $this->openRequest(PlacementRequestType::PERMANENT);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [
            'message' => 'I met them at the shelter today.',
            'phone_number' => '+84901234567',
        ]);

        $response->assertStatus(201);

        $profile = $user->helperProfiles()->sole();
        $this->assertSame(HelperProfileCreatedVia::QUICK_RESPONSE, $profile->created_via);
        $this->assertSame(HelperProfileStatus::PRIVATE, $profile->status);
        $this->assertSame('+84901234567', $profile->phone_number);
        $this->assertSame([PlacementRequestType::PERMANENT->value], $profile->request_types);
    }

    #[Test]
    public function free_foster_request_can_be_answered_without_a_profile(): void
    {
        $placementRequest = $this->openRequest(PlacementRequestType::FOSTER_FREE);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(201);

        $this->assertSame(
            [PlacementRequestType::FOSTER_FREE->value],
            $user->helperProfiles()->sole()->request_types,
        );
    }

    #[Test]
    public function the_created_profile_inherits_the_pets_location(): void
    {
        $placementRequest = $this->openRequest(PlacementRequestType::PERMANENT);
        $pet = $placementRequest->pet;
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(201);

        $profile = $user->helperProfiles()->sole();
        $this->assertSame($pet->country, $profile->country);
        $this->assertSame($pet->city_id, $profile->city_id);
    }

    #[Test]
    public function paid_foster_still_requires_a_profile(): void
    {
        $placementRequest = $this->openRequest(PlacementRequestType::FOSTER_PAID);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(403);

        $this->assertDatabaseCount('helper_profiles', 0);
    }

    #[Test]
    public function pet_sitting_still_requires_a_profile(): void
    {
        $placementRequest = $this->openRequest(PlacementRequestType::PET_SITTING);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(403);

        $this->assertDatabaseCount('helper_profiles', 0);
    }

    #[Test]
    public function an_existing_active_profile_is_reused_rather_than_duplicated(): void
    {
        $placementRequest = $this->openRequest(PlacementRequestType::PERMANENT);
        $user = User::factory()->create();
        $existing = HelperProfile::factory()->create(['user_id' => $user->id]);
        Sanctum::actingAs($user);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(201);

        $this->assertSame(1, $user->helperProfiles()->count());
        $this->assertDatabaseHas('placement_request_responses', [
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $existing->id,
        ]);
    }

    #[Test]
    public function a_user_whose_only_profile_is_archived_gets_a_quick_one(): void
    {
        // The write path used to accept an archived profile while can_respond
        // reported false for it. Now it is skipped, and on a quick-eligible
        // request the user gets a usable profile instead of a 403.
        $placementRequest = $this->openRequest(PlacementRequestType::PERMANENT);
        $user = User::factory()->create();
        HelperProfile::factory()->create([
            'user_id' => $user->id,
            'status' => HelperProfileStatus::ARCHIVED,
        ]);
        Sanctum::actingAs($user);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(201);

        $this->assertSame(
            HelperProfileCreatedVia::QUICK_RESPONSE,
            $user->helperProfiles()->active()->sole()->created_via,
        );
    }

    #[Test]
    public function an_archived_profile_is_refused_on_a_paid_request(): void
    {
        $placementRequest = $this->openRequest(PlacementRequestType::FOSTER_PAID);
        $user = User::factory()->create();
        HelperProfile::factory()->create([
            'user_id' => $user->id,
            'status' => HelperProfileStatus::ARCHIVED,
        ]);
        Sanctum::actingAs($user);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(403);
    }

    #[Test]
    public function responding_twice_is_a_conflict_and_creates_one_profile(): void
    {
        $placementRequest = $this->openRequest(PlacementRequestType::PERMANENT);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(201);
        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(409);

        $this->assertSame(1, $user->helperProfiles()->count());
        $this->assertSame(1, PlacementRequestResponse::where('placement_request_id', $placementRequest->id)->count());
    }

    #[Test]
    public function a_rejected_user_cannot_quick_respond_again_with_a_fresh_profile(): void
    {
        // Archiving a rejected profile must not reset the owner's rejection:
        // the block belongs to the person, not to one profile row.
        $placementRequest = $this->openRequest(PlacementRequestType::PERMANENT);
        $user = User::factory()->create();
        $profile = HelperProfile::factory()->create(['user_id' => $user->id]);
        PlacementRequestResponse::create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $profile->id,
            'status' => PlacementResponseStatus::REJECTED,
            'responded_at' => now(),
            'rejected_at' => now(),
        ]);
        $profile->update(['status' => HelperProfileStatus::ARCHIVED]);
        Sanctum::actingAs($user);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(403);

        $this->assertSame(1, $user->helperProfiles()->withoutGlobalScopes()->count());
    }

    #[Test]
    public function the_pets_owner_cannot_quick_respond_to_their_own_request(): void
    {
        $owner = User::factory()->create();
        $placementRequest = $this->openRequest(PlacementRequestType::PERMANENT, $owner);
        Sanctum::actingAs($owner);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(403);

        $this->assertDatabaseCount('helper_profiles', 0);
    }

    #[Test]
    public function an_unverified_user_cannot_quick_respond(): void
    {
        // Quick responses deliberately stay behind the `verified` gate. If this
        // ever starts passing, someone has opened a write endpoint to throwaway
        // accounts on a public page.
        $placementRequest = $this->openRequest(PlacementRequestType::PERMANENT);
        $user = User::factory()->unverified()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(403);

        $this->assertDatabaseCount('helper_profiles', 0);
    }

    #[Test]
    public function a_bad_phone_number_is_rejected_before_anything_is_created(): void
    {
        $placementRequest = $this->openRequest(PlacementRequestType::PERMANENT);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [
            'phone_number' => 'call me maybe',
        ])->assertStatus(422);

        $this->assertDatabaseCount('helper_profiles', 0);
        $this->assertDatabaseCount('placement_request_responses', 0);
    }

    #[Test]
    public function a_quick_response_can_be_accepted_and_transfers_to_the_right_user(): void
    {
        $owner = User::factory()->create();
        $placementRequest = $this->openRequest(PlacementRequestType::PERMANENT, $owner);
        $helper = User::factory()->create();

        Sanctum::actingAs($helper);
        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(201);

        $responseId = PlacementRequestResponse::where('placement_request_id', $placementRequest->id)->sole()->id;

        Sanctum::actingAs($owner);
        $this->postJson("/api/placement-responses/{$responseId}/accept")->assertStatus(200);

        $this->assertDatabaseHas('transfer_requests', [
            'placement_request_id' => $placementRequest->id,
            'placement_request_response_id' => $responseId,
            'from_user_id' => $owner->id,
            'to_user_id' => $helper->id,
        ]);
    }

    #[Test]
    public function anonymous_viewers_are_told_whether_a_quick_response_is_on_offer(): void
    {
        $permanent = $this->openRequest(PlacementRequestType::PERMANENT);
        $paid = $this->openRequest(PlacementRequestType::FOSTER_PAID);

        $this->getJson("/api/placement-requests/{$permanent->id}")
            ->assertOk()
            ->assertJsonPath('data.available_actions.can_respond', false)
            ->assertJsonPath('data.available_actions.can_quick_respond', true);

        $this->getJson("/api/placement-requests/{$paid->id}")
            ->assertOk()
            ->assertJsonPath('data.available_actions.can_quick_respond', false);
    }

    #[Test]
    public function responding_leaves_a_receipt_in_the_bell(): void
    {
        $placementRequest = $this->openRequest(PlacementRequestType::PERMANENT);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(201);

        // The offer itself, so it outlives the toast that announced it.
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => NotificationType::OWN_PLACEMENT_RESPONSE->value,
        ]);

        // And the profile we made without being asked, which is a disclosure
        // rather than a nicety.
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => NotificationType::HELPER_PROFILE_AUTO_CREATED->value,
        ]);
    }

    #[Test]
    public function the_receipt_names_the_pet_and_links_to_the_request(): void
    {
        // Regression: the toast rendered a literal "{{name}}" because the
        // translation was resolved without interpolation values.
        $placementRequest = $this->openRequest(PlacementRequestType::PERMANENT);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(201);

        $receipt = Notification::where('user_id', $user->id)
            ->where('type', NotificationType::OWN_PLACEMENT_RESPONSE->value)
            ->sole();

        $this->assertStringContainsString($placementRequest->pet->name, $receipt->data['message']);
        $this->assertStringNotContainsString(':pet', $receipt->data['message']);
        $this->assertSame("/requests/{$placementRequest->id}", $receipt->data['link']);
    }

    #[Test]
    public function the_profile_receipt_links_to_the_profile_that_was_created(): void
    {
        $placementRequest = $this->openRequest(PlacementRequestType::PERMANENT);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(201);

        $profile = $user->helperProfiles()->sole();
        $receipt = Notification::where('user_id', $user->id)
            ->where('type', NotificationType::HELPER_PROFILE_AUTO_CREATED->value)
            ->sole();

        $this->assertSame("/helper/{$profile->id}", $receipt->data['link']);
    }

    #[Test]
    public function someone_who_already_had_a_profile_is_not_told_one_was_created(): void
    {
        $placementRequest = $this->openRequest(PlacementRequestType::PERMANENT);
        $user = User::factory()->create();
        HelperProfile::factory()->create(['user_id' => $user->id]);
        Sanctum::actingAs($user);

        $this->postJson("/api/placement-requests/{$placementRequest->id}/responses", [])
            ->assertStatus(201);

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $user->id,
            'type' => NotificationType::HELPER_PROFILE_AUTO_CREATED->value,
        ]);
    }

    #[Test]
    public function receipts_are_never_emailed(): void
    {
        // Emailing somebody about their own click is noise, and email_enabled
        // defaults to true, so this has to be enforced by using the in-app
        // channel directly rather than by a preference.
        $this->assertTrue(NotificationType::OWN_PLACEMENT_RESPONSE->isActivityReceipt());
        $this->assertTrue(NotificationType::HELPER_PROFILE_AUTO_CREATED->isActivityReceipt());

        $configurable = array_map(
            static fn (NotificationType $type): string => $type->value,
            NotificationType::configurableCases(),
        );

        $this->assertNotContains(NotificationType::OWN_PLACEMENT_RESPONSE->value, $configurable);
        $this->assertNotContains(NotificationType::HELPER_PROFILE_AUTO_CREATED->value, $configurable);
    }

    #[Test]
    public function a_closed_request_offers_no_quick_response(): void
    {
        // Asserted on the model rather than over HTTP: a finalized request is not
        // visible to an uninvolved viewer at all, so there is no response body to
        // read the flag out of. The rule itself still needs pinning.
        $placementRequest = $this->openRequest(PlacementRequestType::PERMANENT);
        $this->assertTrue($placementRequest->allowsQuickResponse());

        $placementRequest->update(['status' => PlacementRequestStatus::FINALIZED]);
        $this->assertFalse($placementRequest->fresh()->allowsQuickResponse());
    }
}
