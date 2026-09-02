<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\ChatType;
use App\Enums\ContextableType;
use App\Enums\GroupRole;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\PlacementResponseStatus;
use App\Models\Chat;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\HelperProfile;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\User;
use App\Services\Groups\GroupMembershipService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GroupPlacementChatTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_responder_and_every_volunteer_share_one_thread(): void
    {
        $f = $this->fixture();
        $responder = $this->responderFor($f['request']);

        $chatId = $this->openChat($responder, $f['admin'], $f['request']);
        $chat = Chat::findOrFail($chatId);

        $this->assertSame(ChatType::PRIVATE_GROUP, $chat->type);

        $participantIds = $chat->activeParticipants->pluck('id')->sort()->values()->all();
        $expected = collect([$responder, $f['admin'], $f['memberB'], $f['memberC']])
            ->pluck('id')->sort()->values()->all();

        $this->assertSame($expected, $participantIds);

        // Any volunteer can post into it, not just whoever opened it.
        foreach ([$f['admin'], $f['memberB'], $f['memberC']] as $volunteer) {
            $this->actingAs($volunteer)
                ->postJson("/api/msg/chats/{$chatId}/messages", ['type' => 'text', 'content' => 'From '.$volunteer->name])
                ->assertSuccessful();
        }
    }

    public function test_the_same_thread_is_returned_whoever_opens_it_first(): void
    {
        $f = $this->fixture();
        $responder = $this->responderFor($f['request']);

        $fromVolunteer = $this->openChat($f['memberB'], $responder, $f['request']);
        $fromResponder = $this->openChat($responder, $f['admin'], $f['request']);
        $again = $this->openChat($f['memberC'], $responder, $f['request']);

        $this->assertSame($fromVolunteer, $fromResponder);
        $this->assertSame($fromVolunteer, $again);
        $this->assertSame(1, Chat::query()->where('type', ChatType::PRIVATE_GROUP)->count());
    }

    public function test_a_second_responder_gets_a_separate_thread(): void
    {
        $f = $this->fixture();
        $first = $this->responderFor($f['request']);
        $second = $this->responderFor($f['request']);

        $firstChat = $this->openChat($first, $f['admin'], $f['request']);
        $secondChat = $this->openChat($second, $f['admin'], $f['request']);

        $this->assertNotSame($firstChat, $secondChat);

        // Responders must never see each other's conversation with the rescue.
        $this->actingAs($first)->getJson("/api/msg/chats/{$secondChat}")->assertForbidden();
        $this->actingAs($second)->getJson("/api/msg/chats/{$firstChat}")->assertForbidden();
    }

    public function test_leaving_the_group_ends_access_but_keeps_the_history(): void
    {
        $f = $this->fixture();
        $responder = $this->responderFor($f['request']);
        $chatId = $this->openChat($responder, $f['admin'], $f['request']);

        $this->actingAs($f['memberC'])
            ->postJson("/api/msg/chats/{$chatId}/messages", ['type' => 'text', 'content' => 'C was here'])
            ->assertSuccessful();

        app(GroupMembershipService::class)->leave($f['group'], $f['memberC']);

        $this->actingAs($f['memberC'])->getJson("/api/msg/chats/{$chatId}")->assertForbidden();

        // The others keep the thread, C's message included.
        $this->actingAs($f['memberB'])
            ->getJson("/api/msg/chats/{$chatId}/messages")
            ->assertOk()
            ->assertJsonFragment(['content' => 'C was here']);
    }

    public function test_joining_grants_access_to_open_threads_only(): void
    {
        $f = $this->fixture();
        $responder = $this->responderFor($f['request']);
        $openChatId = $this->openChat($responder, $f['admin'], $f['request']);

        // A second pet in the same group whose request is already closed.
        $closedPet = $this->createPetWithOwner($f['admin']);
        GroupPet::factory()->active()->create([
            'group_id' => $f['group']->id,
            'pet_id' => $closedPet->id,
            'added_by_user_id' => $f['admin']->id,
        ]);
        $closedRequest = $this->openRequest($closedPet, $f['admin']);
        $closedResponder = $this->responderFor($closedRequest);
        $closedChatId = $this->openChat($closedResponder, $f['admin'], $closedRequest);
        $closedRequest->update(['status' => PlacementRequestStatus::FULFILLED]);

        $newcomer = User::factory()->create(['name' => 'Newcomer']);
        app(GroupMembershipService::class)->addMember($f['group'], $newcomer, GroupRole::MEMBER, $f['admin']);

        $this->actingAs($newcomer)->getJson("/api/msg/chats/{$openChatId}")->assertOk();
        $this->actingAs($newcomer)->getJson("/api/msg/chats/{$closedChatId}")->assertForbidden();
    }

    public function test_an_api_token_cannot_open_a_group_chat(): void
    {
        $f = $this->fixture();
        $responder = $this->responderFor($f['request']);
        $token = $f['admin']->createToken('agent', ['messages:write'])->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/msg/chats', [
                'type' => 'direct',
                'recipient_id' => $responder->id,
                'contextable_type' => ContextableType::PLACEMENT_REQUEST->value,
                'contextable_id' => $f['request']->id,
            ])
            ->assertStatus(422);

        $this->assertSame(0, Chat::query()->where('type', ChatType::PRIVATE_GROUP)->count());
    }

    public function test_a_pet_in_no_group_still_gets_a_direct_chat(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $request = $this->openRequest($pet, $owner);
        $responder = $this->responderFor($request);

        $chatId = $this->openChat($responder, $owner, $request);

        $chat = Chat::findOrFail($chatId);
        $this->assertSame(ChatType::DIRECT, $chat->type);
        $this->assertCount(2, $chat->activeParticipants);
    }

    public function test_the_thread_names_the_rescue_and_counts_who_is_reading(): void
    {
        $f = $this->fixture();
        $responder = $this->responderFor($f['request']);

        $this->actingAs($responder)
            ->postJson('/api/msg/chats', [
                'type' => 'direct',
                'recipient_id' => $f['admin']->id,
                'contextable_type' => ContextableType::PLACEMENT_REQUEST->value,
                'contextable_id' => $f['request']->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.group_name', $f['group']->name)
            ->assertJsonPath('data.participant_count', 4);
    }

    private function openChat(User $actor, User $recipient, PlacementRequest $request): int
    {
        $response = $this->actingAs($actor)
            ->postJson('/api/msg/chats', [
                'type' => 'direct',
                'recipient_id' => $recipient->id,
                'contextable_type' => ContextableType::PLACEMENT_REQUEST->value,
                'contextable_id' => $request->id,
            ])
            ->assertCreated();

        return (int) $response->json('data.id');
    }

    private function responderFor(PlacementRequest $request): User
    {
        $responder = User::factory()->create();

        PlacementRequestResponse::factory()->create([
            'placement_request_id' => $request->id,
            'helper_profile_id' => HelperProfile::factory()->create(['user_id' => $responder->id])->id,
            'status' => PlacementResponseStatus::RESPONDED,
        ]);

        return $responder;
    }

    private function openRequest(Pet $pet, User $creator): PlacementRequest
    {
        return PlacementRequest::factory()->create([
            'pet_id' => $pet->id,
            'user_id' => $creator->id,
            'request_type' => PlacementRequestType::PERMANENT,
            'status' => PlacementRequestStatus::OPEN,
            'start_date' => now()->addDay(),
        ]);
    }

    /**
     * @return array{admin: User, memberB: User, memberC: User, pet: Pet, group: Group, request: PlacementRequest}
     */
    private function fixture(): array
    {
        $admin = User::factory()->create(['name' => 'Admin']);
        $memberB = User::factory()->create(['name' => 'Volunteer B']);
        $memberC = User::factory()->create(['name' => 'Volunteer C']);

        $pet = $this->createPetWithOwner($admin);
        $group = Group::factory()->create(['created_by_user_id' => $admin->id]);

        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $admin->id,
        ]);

        foreach ([$memberB, $memberC] as $member) {
            GroupMembership::factory()->member()->active()->create([
                'group_id' => $group->id,
                'user_id' => $member->id,
                'invited_by_user_id' => $admin->id,
            ]);
        }

        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $pet->id,
            'added_by_user_id' => $admin->id,
        ]);

        return [
            'admin' => $admin,
            'memberB' => $memberB,
            'memberC' => $memberC,
            'pet' => $pet,
            'group' => $group,
            'request' => $this->openRequest($pet, $admin),
        ];
    }
}
