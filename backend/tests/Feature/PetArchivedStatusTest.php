<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PetStatus;
use App\Models\Pet;
use App\Models\User;
use Tests\TestCase;

class PetArchivedStatusTest extends TestCase
{
    public function test_owner_can_archive_and_restore_a_pet(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $this->actingAs($owner)
            ->putJson(route('pets.updateStatus', $pet), ['status' => PetStatus::ARCHIVED->value])
            ->assertOk()
            ->assertJsonPath('data.status', PetStatus::ARCHIVED->value);

        $this->assertDatabaseHas('pets', ['id' => $pet->id, 'status' => PetStatus::ARCHIVED->value]);

        $this->actingAs($owner)
            ->putJson(route('pets.updateStatus', $pet), [
                'status' => PetStatus::ACTIVE->value,
                'expected_status' => PetStatus::ARCHIVED->value,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', PetStatus::ACTIVE->value);
    }

    public function test_archived_pets_are_not_featured(): void
    {
        $owner = User::factory()->create();
        $archived = $this->createPetWithOwner($owner);
        $archived->update(['status' => PetStatus::ARCHIVED]);

        $response = $this->getJson('/api/pets/featured')->assertOk();

        $this->assertNotContains($archived->id, array_column($response->json('data'), 'id'));
    }

    public function test_archived_pet_stays_visible_to_its_owner(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);
        $pet->update(['status' => PetStatus::ARCHIVED]);

        $this->assertNotNull(Pet::find($pet->id));
        $this->actingAs($owner)
            ->getJson("/api/pets/{$pet->id}")
            ->assertOk()
            ->assertJsonPath('data.status', PetStatus::ARCHIVED->value);
    }
}
