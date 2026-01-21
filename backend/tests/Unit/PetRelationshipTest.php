<?php

namespace Tests\Unit;

use App\Enums\PetRelationshipType;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\User;
use App\Services\PetRelationshipService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PetRelationshipTest extends TestCase
{
    use RefreshDatabase;

    private PetRelationshipService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new PetRelationshipService;
    }

    public function test_can_create_owner_relationship(): void
    {
        $user = User::factory()->create();
        $pet = Pet::factory()->create();
        $creator = User::factory()->create();

        $relationship = $this->service->createRelationship(
            $user,
            $pet,
            PetRelationshipType::OWNER,
            $creator
        );

        $this->assertInstanceOf(PetRelationship::class, $relationship);
        $this->assertPetOwnedBy($pet, $user);
        $this->assertEquals($pet->id, $relationship->pet_id);
        $this->assertEquals(PetRelationshipType::OWNER, $relationship->relationship_type);
        $this->assertNull($relationship->end_at);
    }

    public function test_pet_can_have_multiple_owners(): void
    {
        $owner1 = User::factory()->create();
        $owner2 = User::factory()->create();
        $creator = User::factory()->create();

        // Create pet with a specific creator to avoid automatic relationship duplication
        $pet = Pet::factory()->create(['created_by' => $creator->id]);

        $this->service->createRelationship($owner1, $pet, PetRelationshipType::OWNER, $creator);
        $this->service->createRelationship($owner2, $pet, PetRelationshipType::OWNER, $creator);

        $owners = $pet->fresh()->owners;
        // Should have 3 owners: the creator (automatic) + owner1 + owner2
        $this->assertCount(3, $owners);
        $this->assertTrue($owners->contains($owner1));
        $this->assertTrue($owners->contains($owner2));
        $this->assertTrue($owners->contains($creator));
    }

    public function test_can_end_relationship(): void
    {
        $user = User::factory()->create();
        $pet = Pet::factory()->create();
        $creator = User::factory()->create();

        $relationship = $this->service->createRelationship(
            $user,
            $pet,
            PetRelationshipType::OWNER,
            $creator
        );

        $this->assertNull($relationship->end_at);

        $endedRelationship = $this->service->endRelationship($relationship);

        $this->assertNotNull($endedRelationship->end_at);
        $this->assertFalse($endedRelationship->isActive());
    }

    public function test_pet_relationship_methods(): void
    {
        $owner = User::factory()->create();
        $editor = User::factory()->create();
        $viewer = User::factory()->create();
        $pet = Pet::factory()->create();

        PetRelationship::factory()->owner()->active()->create([
            'user_id' => $owner->id,
            'pet_id' => $pet->id,
            'created_by' => $owner->id,
        ]);

        PetRelationship::factory()->editor()->active()->create([
            'user_id' => $editor->id,
            'pet_id' => $pet->id,
            'created_by' => $owner->id,
        ]);

        PetRelationship::factory()->viewer()->active()->create([
            'user_id' => $viewer->id,
            'pet_id' => $pet->id,
            'created_by' => $owner->id,
        ]);

        $this->assertTrue($pet->isOwnedBy($owner));
        $this->assertFalse($pet->isOwnedBy($editor));

        $this->assertTrue($pet->canBeEditedBy($owner));
        $this->assertTrue($pet->canBeEditedBy($editor));
        $this->assertFalse($pet->canBeEditedBy($viewer));

        $this->assertTrue($pet->canBeViewedBy($owner));
        $this->assertTrue($pet->canBeViewedBy($editor));
        $this->assertTrue($pet->canBeViewedBy($viewer));
    }

    public function test_user_relationship_methods(): void
    {
        $user = User::factory()->create();
        $ownedPet = Pet::factory()->create();
        $editablePet = Pet::factory()->create();
        $viewablePet = Pet::factory()->create();

        PetRelationship::factory()->owner()->active()->create([
            'user_id' => $user->id,
            'pet_id' => $ownedPet->id,
            'created_by' => $user->id,
        ]);

        PetRelationship::factory()->editor()->active()->create([
            'user_id' => $user->id,
            'pet_id' => $editablePet->id,
            'created_by' => $user->id,
        ]);

        PetRelationship::factory()->viewer()->active()->create([
            'user_id' => $user->id,
            'pet_id' => $viewablePet->id,
            'created_by' => $user->id,
        ]);

        $this->assertCount(1, $user->ownedPets);
        $this->assertCount(1, $user->editablePets);
        $this->assertCount(1, $user->viewablePets);

        $this->assertTrue($user->ownedPets->contains($ownedPet));
        $this->assertTrue($user->editablePets->contains($editablePet));
        $this->assertTrue($user->viewablePets->contains($viewablePet));
    }
}
