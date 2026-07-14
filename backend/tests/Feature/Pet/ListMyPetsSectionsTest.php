<?php

declare(strict_types=1);

namespace Tests\Feature\Pet;

use App\Enums\GroupRole;
use App\Enums\PetRelationshipType;
use App\Models\Group;
use App\Models\GroupMembership;
use App\Models\GroupPet;
use App\Models\PetRelationship;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ListMyPetsSectionsTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_returns_deduplicated_sections_with_viewer_permissions_and_shared(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $owned = $this->createPetWithOwner($user);

        $foster = $this->createPetWithOwner($other);
        PetRelationship::factory()->foster()->active()->create([
            'user_id' => $user->id,
            'pet_id' => $foster->id,
            'created_by' => $other->id,
        ]);

        $shared = $this->createPetWithOwner($other);
        PetRelationship::factory()->editor()->active()->create([
            'user_id' => $user->id,
            'pet_id' => $shared->id,
            'created_by' => $other->id,
        ]);

        $viewerShared = $this->createPetWithOwner($other);
        PetRelationship::factory()->viewer()->active()->create([
            'user_id' => $user->id,
            'pet_id' => $viewerShared->id,
            'created_by' => $other->id,
        ]);

        $pastFoster = $this->createPetWithOwner($other);
        PetRelationship::factory()->foster()->create([
            'user_id' => $user->id,
            'pet_id' => $pastFoster->id,
            'created_by' => $other->id,
            'end_at' => now()->subDay(),
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/my-pets/sections');

        $response->assertOk()
            ->assertJsonPath('data.context.type', 'all')
            ->assertJsonPath('data.owned.0.id', $owned->id)
            ->assertJsonPath('data.owned.0.viewer_permissions.is_owner', true)
            ->assertJsonPath('data.fostering_active.0.id', $foster->id)
            ->assertJsonPath('data.fostering_active.0.viewer_permissions.is_foster', true)
            ->assertJsonPath('data.fostering_past.0.id', $pastFoster->id);

        $sharedIds = collect($response->json('data.shared'))->pluck('id')->all();
        $this->assertEqualsCanonicalizing([$shared->id, $viewerShared->id], $sharedIds);

        $editorCard = collect($response->json('data.shared'))->firstWhere('id', $shared->id);
        $this->assertTrue($editorCard['viewer_permissions']['can_edit']);
        $this->assertTrue($editorCard['viewer_permissions']['is_editor']);
        $this->assertSame(
            [['type' => 'relationship', 'role' => PetRelationshipType::EDITOR->value]],
            $editorCard['viewer_permissions']['access_sources']
        );
    }

    #[Test]
    public function it_filters_by_group_id_for_members_and_forbids_non_members(): void
    {
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $outsider = User::factory()->create();

        $group = Group::factory()->create([
            'name' => 'Sections Group',
            'created_by_user_id' => $admin->id,
        ]);
        GroupMembership::factory()->admin()->active()->create([
            'group_id' => $group->id,
            'user_id' => $admin->id,
        ]);
        GroupMembership::factory()->member()->active()->create([
            'group_id' => $group->id,
            'user_id' => $member->id,
            'invited_by_user_id' => $admin->id,
        ]);

        $inGroup = $this->createPetWithOwner($admin);
        $outside = $this->createPetWithOwner($admin);
        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $inGroup->id,
            'added_by_user_id' => $admin->id,
        ]);

        Sanctum::actingAs($member);

        $memberResponse = $this->getJson("/api/my-pets/sections?group_id={$group->id}");
        $memberResponse->assertOk()
            ->assertJsonPath('data.context.type', 'group')
            ->assertJsonPath('data.context.group_id', $group->id)
            ->assertJsonPath('data.context.group_name', 'Sections Group');

        $memberIds = collect([
            ...$memberResponse->json('data.owned'),
            ...$memberResponse->json('data.shared'),
            ...$memberResponse->json('data.fostering_active'),
            ...$memberResponse->json('data.fostering_past'),
        ])->pluck('id')->all();

        $this->assertEqualsCanonicalizing([$inGroup->id], $memberIds);
        $this->assertNotContains($outside->id, $memberIds);

        $sharedCard = collect($memberResponse->json('data.shared'))->firstWhere('id', $inGroup->id);
        $this->assertNotNull($sharedCard);
        $this->assertContains(
            [
                'type' => 'group',
                'id' => $group->id,
                'name' => 'Sections Group',
                'role' => GroupRole::MEMBER->value,
            ],
            $sharedCard['viewer_permissions']['access_sources']
        );

        Sanctum::actingAs($outsider);

        $this->getJson("/api/my-pets/sections?group_id={$group->id}")
            ->assertForbidden();
    }
}
