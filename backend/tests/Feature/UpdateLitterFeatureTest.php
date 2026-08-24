<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Litter;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\PetType;
use App\Models\User;
use App\Services\PetRelationshipService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class UpdateLitterFeatureTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{0: Litter, 1: Pet, 2: Pet}
     */
    private function createLitterWithMembers(User $owner): array
    {
        $petType = PetType::factory()->create(['supports_litters' => true]);
        $litter = Litter::factory()->create([
            'name' => 'Old name',
            'pet_type_id' => $petType->id,
            'created_by' => $owner->id,
        ]);
        $first = Pet::factory()->create([
            'pet_type_id' => $petType->id,
            'created_by' => $owner->id,
            'litter_id' => $litter->id,
        ]);
        $second = Pet::factory()->create([
            'pet_type_id' => $petType->id,
            'created_by' => $owner->id,
            'litter_id' => $litter->id,
        ]);

        return [$litter, $first, $second];
    }

    #[Test]
    public function permitted_caller_can_rename_and_receives_only_viewable_members(): void
    {
        $owner = User::factory()->create();
        $newOwner = User::factory()->create();
        [$litter, $visiblePet, $rehomedPet] = $this->createLitterWithMembers($owner);
        app(PetRelationshipService::class)
            ->transferOwnership($rehomedPet, $owner, $newOwner, $owner);

        $response = $this->actingAs($owner)->putJson("/api/litters/{$litter->id}", [
            'name' => 'The Sunbeams',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'The Sunbeams')
            ->assertJsonCount(1, 'data.pets')
            ->assertJsonPath('data.pets.0.id', $visiblePet->id);
        $this->assertDatabaseHas('litters', [
            'id' => $litter->id,
            'name' => 'The Sunbeams',
        ]);
    }

    #[Test]
    public function empty_and_over_length_names_are_rejected(): void
    {
        $owner = User::factory()->create();
        [$litter] = $this->createLitterWithMembers($owner);

        $this->actingAs($owner)
            ->putJson("/api/litters/{$litter->id}", ['name' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);

        $this->putJson("/api/litters/{$litter->id}", ['name' => str_repeat('a', 256)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);

        $this->assertDatabaseHas('litters', ['id' => $litter->id, 'name' => 'Old name']);
    }

    #[Test]
    public function caller_who_cannot_edit_every_visible_member_is_forbidden(): void
    {
        $owner = User::factory()->create();
        $caller = User::factory()->create();
        [$litter, $editablePet, $viewOnlyPet] = $this->createLitterWithMembers($owner);
        PetRelationship::factory()->editor()->active()->create([
            'user_id' => $caller->id,
            'pet_id' => $editablePet->id,
            'created_by' => $owner->id,
        ]);
        PetRelationship::factory()->viewer()->active()->create([
            'user_id' => $caller->id,
            'pet_id' => $viewOnlyPet->id,
            'created_by' => $owner->id,
        ]);

        $this->actingAs($caller)
            ->putJson("/api/litters/{$litter->id}", ['name' => 'Forbidden name'])
            ->assertForbidden();

        $this->assertDatabaseHas('litters', ['id' => $litter->id, 'name' => 'Old name']);
    }

    #[Test]
    public function caller_with_no_viewable_member_is_forbidden(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        [$litter] = $this->createLitterWithMembers($owner);

        $this->actingAs($stranger)
            ->putJson("/api/litters/{$litter->id}", ['name' => 'Forbidden name'])
            ->assertForbidden();

        $this->assertDatabaseHas('litters', ['id' => $litter->id, 'name' => 'Old name']);
    }

    #[Test]
    public function stale_base_version_is_rejected_without_renaming(): void
    {
        $owner = User::factory()->create();
        $newOwner = User::factory()->create();
        [$litter, $visiblePet, $rehomedPet] = $this->createLitterWithMembers($owner);
        app(PetRelationshipService::class)
            ->transferOwnership($rehomedPet, $owner, $newOwner, $owner);

        $this->actingAs($owner)
            ->putJson("/api/litters/{$litter->id}", [
                'name' => 'Stale name',
                'base_version' => '2000-01-01T00:00:00.000000Z',
            ])
            ->assertConflict()
            ->assertJsonCount(1, 'data.server_value.pets')
            ->assertJsonPath('data.server_value.pets.0.id', $visiblePet->id);

        $this->assertDatabaseHas('litters', ['id' => $litter->id, 'name' => 'Old name']);
    }
}
