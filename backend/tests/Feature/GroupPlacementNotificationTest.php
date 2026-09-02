<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\HelperProfile;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class GroupPlacementNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
    }

    public function test_every_member_is_notified_in_app_but_only_creator_and_admins_get_email(): void
    {
        $fixture = $this->groupFixture();
        $creator = $fixture['members'][0];
        $plainMember = $fixture['members'][1];

        $placementRequest = $this->openRequest($fixture['pet'], $creator);
        $this->respondAsOutsider($placementRequest);

        // Admin (also the pet's owner) is accountable, so the inbox is fair game.
        $this->assertHasChannel($fixture['admin'], 'email');
        $this->assertHasChannel($fixture['admin'], 'in_app');

        // The volunteer who put the listing up hears about it properly too.
        $this->assertHasChannel($creator, 'email');
        $this->assertHasChannel($creator, 'in_app');

        // Everyone else sees it in the app and nowhere else. This is the whole
        // point of the design: twenty volunteers must not mean twenty emails.
        $this->assertHasChannel($plainMember, 'in_app');
        $this->assertLacksChannel($plainMember, 'email');
    }

    public function test_a_user_who_is_owner_creator_and_admin_is_notified_once_per_channel(): void
    {
        $fixture = $this->groupFixture();
        $admin = $fixture['admin'];

        // The admin owns the pet and creates the listing: three reasons to be in
        // the audience, one notification each way.
        $placementRequest = $this->openRequest($fixture['pet'], $admin);
        $this->respondAsOutsider($placementRequest);

        $this->assertSame(1, $this->countFor($admin, 'email'));
        $this->assertSame(1, $this->countFor($admin, 'in_app'));
    }

    public function test_a_pet_in_no_group_notifies_only_its_owner_with_the_full_treatment(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $stranger = User::factory()->create();

        $placementRequest = $this->openRequest($pet, $owner);
        $this->respondAsOutsider($placementRequest);

        $this->assertHasChannel($owner, 'email');
        $this->assertHasChannel($owner, 'in_app');
        $this->assertSame(0, $this->countFor($stranger, 'in_app'));
    }

    public function test_fan_out_still_honours_a_disabled_channel(): void
    {
        $fixture = $this->groupFixture();
        $admin = $fixture['admin'];

        NotificationPreference::create([
            'user_id' => $admin->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => false,
            'in_app_enabled' => true,
        ]);

        $placementRequest = $this->openRequest($fixture['pet'], $fixture['members'][0]);
        $this->respondAsOutsider($placementRequest);

        // In the email audience, but opted out. The fan-out must not override that.
        $this->assertLacksChannel($admin, 'email');
        $this->assertHasChannel($admin, 'in_app');
    }

    public function test_a_rehomed_pet_moves_to_the_groups_past_section(): void
    {
        $fixture = $this->groupFixture();
        $group = $fixture['group'];
        $pet = $fixture['pet'];

        $active = $this->actingAs($fixture['admin'])
            ->getJson("/api/my-pets/sections?group_id={$group->id}");

        $active->assertOk()
            ->assertJsonPath('data.group_past', [])
            ->assertJsonCount(1, 'data.owned');

        GroupPet::query()
            ->where('group_id', $group->id)
            ->where('pet_id', $pet->id)
            ->update(['end_at' => now()]);

        $past = $this->actingAs($fixture['admin'])
            ->getJson("/api/my-pets/sections?group_id={$group->id}");

        $past->assertOk()
            ->assertJsonCount(1, 'data.group_past')
            ->assertJsonPath('data.group_past.0.id', $pet->id)
            ->assertJsonCount(0, 'data.owned');
    }

    public function test_the_past_section_key_is_present_outside_group_context(): void
    {
        $owner = User::factory()->create();
        $this->createPetWithOwner($owner);

        $this->actingAs($owner)
            ->getJson('/api/my-pets/sections')
            ->assertOk()
            ->assertJsonPath('data.context.type', 'all')
            ->assertJsonPath('data.group_past', []);
    }

    private function assertHasChannel(User $user, string $channel): void
    {
        $this->assertGreaterThan(
            0,
            $this->countFor($user, $channel),
            "expected {$user->name} to get a {$channel} notification"
        );
    }

    private function assertLacksChannel(User $user, string $channel): void
    {
        $this->assertSame(
            0,
            $this->countFor($user, $channel),
            "expected {$user->name} NOT to get a {$channel} notification"
        );
    }

    private function countFor(User $user, string $channel): int
    {
        return Notification::query()
            ->where('user_id', $user->id)
            ->where('type', NotificationType::PLACEMENT_REQUEST_RESPONSE->value)
            ->get()
            ->where('data.channel', $channel)
            ->count();
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

    private function respondAsOutsider(PlacementRequest $placementRequest): void
    {
        $helper = User::factory()->create();
        HelperProfile::factory()->create(['user_id' => $helper->id]);

        $this->actingAs($helper)
            ->postJson("/api/placement-requests/{$placementRequest->id}/responses", [
                'message' => 'I would love to adopt.',
            ])
            ->assertCreated();
    }

    /**
     * @return array{admin: User, members: list<User>, pet: Pet, group: Group}
     */
    private function groupFixture(): array
    {
        $admin = User::factory()->create(['name' => 'Admin']);
        $memberOne = User::factory()->create(['name' => 'Creator']);
        $memberTwo = User::factory()->create(['name' => 'Plain member']);

        $pet = $this->createPetWithOwner($admin);
        $group = Group::factory()->create(['created_by_user_id' => $admin->id]);

        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $admin->id,
        ]);

        foreach ([$memberOne, $memberTwo] as $member) {
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
            'members' => [$memberOne, $memberTwo],
            'pet' => $pet,
            'group' => $group,
        ];
    }
}
