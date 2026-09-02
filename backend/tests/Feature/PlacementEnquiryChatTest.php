<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\ChatType;
use App\Enums\ContextableType;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * The public Q&A tells people to sign in if they want a private conversation,
 * so this covers the door that promise points at. Before this feature, a group
 * held listing refused anyone who had not already built a helper profile and
 * filed a formal placement response.
 */
class PlacementEnquiryChatTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function a_verified_stranger_can_open_a_thread_on_a_group_held_listing(): void
    {
        $f = $this->groupListing();
        $stranger = User::factory()->create(['email_verified_at' => now()]);

        $response = $this->actingAs($stranger)
            ->postJson('/api/msg/chats', [
                'type' => 'direct',
                'recipient_id' => $f['admin']->id,
                'contextable_type' => ContextableType::PLACEMENT_REQUEST->value,
                'contextable_id' => $f['request']->id,
            ])
            ->assertCreated();

        $this->assertSame(ChatType::PRIVATE_GROUP->value, $response->json('data.type'));

        // The thread is keyed on the stranger and every volunteer is in it.
        $participantIds = collect($response->json('data.participants'))->pluck('id')->all();
        $this->assertContains($stranger->id, $participantIds);
        $this->assertContains($f['admin']->id, $participantIds);
        $this->assertContains($f['member']->id, $participantIds);
    }

    #[Test]
    public function an_unverified_user_may_not_open_an_enquiry_thread(): void
    {
        $f = $this->groupListing();
        $stranger = User::factory()->create(['email_verified_at' => null]);

        $this->actingAs($stranger)
            ->postJson('/api/msg/chats', [
                'type' => 'direct',
                'recipient_id' => $f['admin']->id,
                'contextable_type' => ContextableType::PLACEMENT_REQUEST->value,
                'contextable_id' => $f['request']->id,
            ])
            ->assertStatus(403);
    }

    #[Test]
    public function a_closed_listing_does_not_accept_new_enquiry_threads(): void
    {
        $f = $this->groupListing();
        $f['request']->forceFill(['status' => PlacementRequestStatus::FULFILLED])->save();

        $stranger = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($stranger)
            ->postJson('/api/msg/chats', [
                'type' => 'direct',
                'recipient_id' => $f['admin']->id,
                'contextable_type' => ContextableType::PLACEMENT_REQUEST->value,
                'contextable_id' => $f['request']->id,
            ])
            ->assertStatus(422);
    }

    #[Test]
    public function opening_enquiry_threads_is_capped_per_user_per_hour(): void
    {
        config(['placement_questions.enquiry_threads_per_hour' => 2]);

        $stranger = User::factory()->create(['email_verified_at' => now()]);

        $statuses = [];

        for ($i = 0; $i < 3; $i++) {
            $f = $this->groupListing();

            $statuses[] = $this->actingAs($stranger)
                ->postJson('/api/msg/chats', [
                    'type' => 'direct',
                    'recipient_id' => $f['admin']->id,
                    'contextable_type' => ContextableType::PLACEMENT_REQUEST->value,
                    'contextable_id' => $f['request']->id,
                ])
                ->getStatusCode();
        }

        $this->assertSame([201, 201, 429], $statuses);
    }

    /**
     * @return array{admin: User, member: User, pet: Pet, request: PlacementRequest}
     */
    private function groupListing(): array
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();

        $pet = $this->createPetWithOwner($admin);
        $group = Group::factory()->create(['created_by_user_id' => $admin->id]);

        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $admin->id,
        ]);
        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $admin->id,
        ]);
        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $pet->id,
            'added_by_user_id' => $admin->id,
        ]);

        return [
            'admin' => $admin,
            'member' => $member,
            'pet' => $pet,
            'request' => PlacementRequest::factory()->create([
                'pet_id' => $pet->id,
                'user_id' => $admin->id,
                'request_type' => PlacementRequestType::PERMANENT,
                'status' => PlacementRequestStatus::OPEN,
                'start_date' => now()->addDay(),
            ]),
        ];
    }
}
