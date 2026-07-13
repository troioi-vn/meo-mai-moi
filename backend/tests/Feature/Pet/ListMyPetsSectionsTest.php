<?php

declare(strict_types=1);

namespace Tests\Feature\Pet;

use App\Enums\PetRelationshipType;
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
    public function it_does_not_accept_group_id_query_parameter_yet(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // group_id is reserved for the Groups stage; it must not silently filter.
        $this->getJson('/api/my-pets/sections?group_id=1')
            ->assertOk()
            ->assertJsonPath('data.context.type', 'all')
            ->assertJsonMissingPath('data.context.group_id');
    }
}
