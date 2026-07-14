<?php

declare(strict_types=1);

namespace Tests\Feature\Group;

use App\Enums\GroupRole;
use App\Enums\PetStatus;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GroupPetAccessTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function sections_all_includes_group_pets_deduped(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner);
        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $owner->id,
        ]);

        $ownedAlsoInGroup = $this->createPetWithOwner($member);
        $groupOnly = $this->createPetWithOwner($owner);

        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $ownedAlsoInGroup->id,
            'added_by_user_id' => $member->id,
        ]);
        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $groupOnly->id,
            'added_by_user_id' => $owner->id,
        ]);

        Sanctum::actingAs($member);

        $response = $this->getJson('/api/my-pets/sections');

        $response->assertOk()
            ->assertJsonPath('data.context.type', 'all')
            ->assertJsonPath('data.owned.0.id', $ownedAlsoInGroup->id);

        $sharedIds = collect($response->json('data.shared'))->pluck('id')->all();
        $this->assertContains($groupOnly->id, $sharedIds);
        $this->assertNotContains($ownedAlsoInGroup->id, $sharedIds);

        $ownedCard = $response->json('data.owned.0');
        $this->assertTrue($ownedCard['viewer_permissions']['is_owner']);
        $groupSources = collect($ownedCard['viewer_permissions']['access_sources'])
            ->where('type', 'group')
            ->values()
            ->all();
        $this->assertNotEmpty($groupSources);
        $this->assertSame($group->id, $groupSources[0]['id']);
        $this->assertSame($group->name, $groupSources[0]['name']);
        $this->assertSame(GroupRole::MEMBER->value, $groupSources[0]['role']);
    }

    #[Test]
    public function sections_with_group_id_filters_for_members(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroupWithAdmin($admin, 'Filter Group');
        $otherGroup = $this->makeGroupWithAdmin($admin, 'Other Group');

        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $admin->id,
        ]);

        $inGroup = $this->createPetWithOwner($admin);
        $inOther = $this->createPetWithOwner($admin);
        $outside = $this->createPetWithOwner($admin);

        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $inGroup->id,
            'added_by_user_id' => $admin->id,
        ]);
        GroupPet::factory()->active()->create([
            'group_id' => $otherGroup->id,
            'pet_id' => $inOther->id,
            'added_by_user_id' => $admin->id,
        ]);

        Sanctum::actingAs($member);

        $response = $this->getJson("/api/my-pets/sections?group_id={$group->id}");

        $response->assertOk()
            ->assertJsonPath('data.context.type', 'group')
            ->assertJsonPath('data.context.group_id', $group->id)
            ->assertJsonPath('data.context.group_name', 'Filter Group');

        $allIds = collect([
            ...$response->json('data.owned'),
            ...$response->json('data.shared'),
            ...$response->json('data.fostering_active'),
            ...$response->json('data.fostering_past'),
        ])->pluck('id')->all();

        $this->assertEqualsCanonicalizing([$inGroup->id], $allIds);
        $this->assertNotContains($inOther->id, $allIds);
        $this->assertNotContains($outside->id, $allIds);
    }

    #[Test]
    public function public_pet_view_does_not_expose_group_names_in_access_sources(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner, 'Secret Group Name');
        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $owner->id,
        ]);

        $pet = $this->createPetWithOwner($owner, ['status' => PetStatus::LOST]);
        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $pet->id,
            'added_by_user_id' => $owner->id,
        ]);

        Sanctum::actingAs($member);

        $response = $this->getJson("/api/pets/{$pet->id}/view");

        $response->assertOk();
        $permissions = $response->json('data.viewer_permissions');
        $this->assertArrayNotHasKey('access_sources', $permissions);
        $this->assertTrue($permissions['has_active_relationship']);
        $this->assertStringNotContainsString('Secret Group Name', (string) json_encode($response->json('data')));
    }

    private function makeGroupWithAdmin(User $admin, string $name = 'Test Group'): Group
    {
        $group = Group::factory()->create([
            'name' => $name,
            'created_by_user_id' => $admin->id,
        ]);

        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $admin->id,
        ]);

        return $group;
    }
}
