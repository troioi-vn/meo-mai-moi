<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\GroupRole;
use App\Enums\PetRelationshipType;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\LedgerMembership;
use App\Models\PetRelationship;
use App\Models\User;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\PetTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SharingSuggestionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([CurrencySeeder::class, PetTypeSeeder::class]);
    }

    public function test_pet_suggestions_include_people_from_a_shared_group(): void
    {
        $actor = User::factory()->create();
        $collaborator = User::factory()->create(['name' => 'Alice']);
        $group = $this->groupWithMember($actor, GroupRole::ADMIN);
        $this->addGroupMember($group, $collaborator, GroupRole::MEMBER);
        $pet = $this->createPetWithOwner($actor);

        $this->actingAs($actor)
            ->getJson("/api/pets/{$pet->id}/relationship-suggestions")
            ->assertOk()
            ->assertJsonPath('data.0.id', $collaborator->id);
    }

    public function test_group_suggestions_include_ledger_collaborators_and_can_add_the_selected_role(): void
    {
        $actor = User::factory()->create();
        $collaborator = User::factory()->create(['name' => 'Bao']);
        $source = $this->actingAs($actor)->postJson('/api/ledgers', ['title' => 'Shared', 'currency_code' => 'VND'])->json('data');
        LedgerMembership::query()->create(['ledger_id' => $source['id'], 'user_id' => $collaborator->id, 'start_at' => now()]);
        $target = $this->groupWithMember($actor, GroupRole::ADMIN);

        $this->getJson("/api/groups/{$target->id}/member-suggestions")
            ->assertOk()
            ->assertJsonPath('data.0.id', $collaborator->id);

        $this->postJson("/api/groups/{$target->id}/members", ['user_id' => $collaborator->id, 'role' => 'admin'])
            ->assertCreated()
            ->assertJsonPath('data.role', 'admin');
        $this->assertDatabaseHas('group_memberships', ['group_id' => $target->id, 'user_id' => $collaborator->id, 'role' => 'admin', 'end_at' => null]);
    }

    public function test_ledger_suggestions_include_pet_collaborators_and_reject_arbitrary_users(): void
    {
        $actor = User::factory()->create();
        $collaborator = User::factory()->create(['name' => 'Chi']);
        $stranger = User::factory()->create();
        $pet = $this->createPetWithOwner($actor);
        PetRelationship::query()->create([
            'pet_id' => $pet->id,
            'user_id' => $collaborator->id,
            'relationship_type' => PetRelationshipType::EDITOR,
            'start_at' => now(),
            'created_by' => $actor->id,
        ]);
        $ledger = $this->actingAs($actor)->postJson('/api/ledgers', ['title' => 'Target', 'currency_code' => 'VND'])->json('data');

        $this->getJson("/api/ledgers/{$ledger['id']}/member-suggestions")
            ->assertOk()
            ->assertJsonPath('data.0.id', $collaborator->id);
        $this->postJson("/api/ledgers/{$ledger['id']}/members", ['user_id' => $stranger->id])
            ->assertUnprocessable();
        $this->postJson("/api/ledgers/{$ledger['id']}/members", ['user_id' => $collaborator->id])
            ->assertCreated();
        $this->assertDatabaseHas('ledger_memberships', ['ledger_id' => $ledger['id'], 'user_id' => $collaborator->id, 'end_at' => null]);
    }

    private function groupWithMember(User $user, GroupRole $role): Group
    {
        $group = Group::factory()->create(['created_by_user_id' => $user->id]);
        $this->addGroupMember($group, $user, $role);

        return $group;
    }

    private function addGroupMember(Group $group, User $user, GroupRole $role): void
    {
        GroupMembership::query()->create([
            'group_id' => $group->id,
            'user_id' => $user->id,
            'role' => $role,
            'start_at' => now(),
        ]);
    }
}
