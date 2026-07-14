<?php

declare(strict_types=1);

namespace Tests\Feature\Group;

use App\Enums\GroupRole;
use App\Models\City;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\PetType;
use App\Models\User;
use Database\Seeders\PetTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GroupPetAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PetTypeSeeder::class);
    }

    #[Test]
    public function add_and_remove_require_admin_and_direct_owner(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $otherOwner = User::factory()->create();
        $group = $this->makeGroupWithAdmin($admin);
        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $admin->id,
        ]);

        $adminPet = $this->createPetWithOwner($admin);
        $otherPet = $this->createPetWithOwner($otherOwner);

        Sanctum::actingAs($member);
        $this->postJson("/api/groups/{$group->id}/pets/{$adminPet->id}")
            ->assertForbidden();

        Sanctum::actingAs($admin);
        $this->postJson("/api/groups/{$group->id}/pets/{$otherPet->id}")
            ->assertForbidden()
            ->assertJsonPath('message', __('groups.not_pet_owner'));

        $this->postJson("/api/groups/{$group->id}/pets/{$adminPet->id}")
            ->assertOk()
            ->assertJsonPath('data.pet_count', 1);

        $this->assertDatabaseHas('group_pets', [
            'group_id' => $group->id,
            'pet_id' => $adminPet->id,
            'end_at' => null,
        ]);

        Sanctum::actingAs($member);
        $this->deleteJson("/api/groups/{$group->id}/pets/{$adminPet->id}")
            ->assertForbidden();

        Sanctum::actingAs($admin);
        $this->deleteJson("/api/groups/{$group->id}/pets/{$adminPet->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('group_pets', [
            'group_id' => $group->id,
            'pet_id' => $adminPet->id,
            'end_at' => null,
        ]);
    }

    #[Test]
    public function bulk_add_is_all_or_nothing(): void
    {
        $admin = User::factory()->create();
        $other = User::factory()->create();
        $group = $this->makeGroupWithAdmin($admin);
        $owned = $this->createPetWithOwner($admin);
        $notOwned = $this->createPetWithOwner($other);

        Sanctum::actingAs($admin);

        $this->postJson("/api/groups/{$group->id}/pets", [
            'pet_ids' => [$owned->id, $notOwned->id],
        ])
            ->assertForbidden()
            ->assertJsonPath('message', __('groups.not_pet_owner'));

        $this->assertDatabaseCount('group_pets', 0);

        $secondOwned = $this->createPetWithOwner($admin);

        $this->postJson("/api/groups/{$group->id}/pets", [
            'pet_ids' => [$owned->id, $secondOwned->id],
        ])
            ->assertOk()
            ->assertJsonPath('data.pet_count', 2);

        $this->assertDatabaseHas('group_pets', [
            'group_id' => $group->id,
            'pet_id' => $owned->id,
            'end_at' => null,
        ]);
        $this->assertDatabaseHas('group_pets', [
            'group_id' => $group->id,
            'pet_id' => $secondOwned->id,
            'end_at' => null,
        ]);
    }

    #[Test]
    public function pet_creation_with_group_id_assigns_pet(): void
    {
        $admin = User::factory()->create();
        $group = $this->makeGroupWithAdmin($admin);
        $petType = PetType::query()->where('slug', 'cat')->firstOrFail();
        $city = City::factory()->create(['country' => 'VN']);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/pets', [
            'name' => 'Group Kitten',
            'country' => 'VN',
            'city_id' => $city->id,
            'pet_type_id' => $petType->id,
            'group_id' => $group->id,
        ]);

        $response->assertCreated();
        $petId = (int) $response->json('data.id');

        $this->assertDatabaseHas('group_pets', [
            'group_id' => $group->id,
            'pet_id' => $petId,
            'end_at' => null,
            'added_by_user_id' => $admin->id,
        ]);
    }

    #[Test]
    public function member_can_edit_pet_via_group_but_cannot_delete_or_manage_people(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $group = $this->makeGroupWithAdmin($owner);
        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $owner->id,
        ]);

        $pet = $this->createPetWithOwner($owner, ['name' => 'Original']);
        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $pet->id,
            'added_by_user_id' => $owner->id,
        ]);

        Sanctum::actingAs($member);

        $this->putJson("/api/pets/{$pet->id}", ['name' => 'Updated By Member'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated By Member')
            ->assertJsonPath('data.viewer_permissions.can_edit', true)
            ->assertJsonPath('data.viewer_permissions.can_delete', false)
            ->assertJsonPath('data.viewer_permissions.can_manage_people', false);

        $this->assertDatabaseHas('pets', [
            'id' => $pet->id,
            'name' => 'Updated By Member',
        ]);

        $this->deleteJson("/api/pets/{$pet->id}")->assertForbidden();

        $this->postJson("/api/pets/{$pet->id}/invitations", [
            'relationship_type' => 'viewer',
        ])->assertForbidden();

        $this->assertSame(GroupRole::MEMBER, GroupMembership::query()
            ->where('group_id', $group->id)
            ->where('user_id', $member->id)
            ->active()
            ->firstOrFail()
            ->role);
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
