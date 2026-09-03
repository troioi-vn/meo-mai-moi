<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PetStatus;
use App\Models\Litter;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use App\Services\PetRelationshipService;
use Tests\TestCase;

class LitterMemberRemovalGateTest extends TestCase
{
    /**
     * @return array{0: Litter, 1: Pet, 2: Pet}
     */
    private function createLitterWithMembers(User $owner, int $count = 3): array
    {
        $petType = PetType::factory()->create(['supports_litters' => true]);
        $litter = Litter::factory()->create([
            'pet_type_id' => $petType->id,
            'created_by' => $owner->id,
        ]);

        $pets = [];
        for ($i = 0; $i < $count; $i++) {
            $pets[] = Pet::factory()->create([
                'pet_type_id' => $petType->id,
                'created_by' => $owner->id,
                'litter_id' => $litter->id,
            ]);
        }

        return [$litter->refresh(), ...$pets];
    }

    public function test_removal_is_refused_when_caller_lacks_update_on_litter(): void
    {
        $owner = User::factory()->create();
        $neighbour = User::factory()->create();
        [$litter, $ownPet, $lostPet] = $this->createLitterWithMembers($owner, 2);

        // The second member is LOST, hence viewable by everyone but editable
        // only by its owner — so the neighbour clears the litter view gate
        // while failing the update gate.
        $lostPet->update(['status' => PetStatus::LOST]);

        app(PetRelationshipService::class)->transferOwnership($ownPet, $owner, $neighbour, $owner);

        // Sanity: the neighbour can still see the litter (view gate passes).
        $this->actingAs($neighbour)->getJson("/api/litters/{$litter->id}")->assertOk();

        $response = $this->actingAs($neighbour)
            ->deleteJson("/api/litters/{$litter->id}/members/{$ownPet->id}");

        $response->assertForbidden();

        $this->assertDatabaseHas('litters', ['id' => $litter->id]);
        $this->assertDatabaseHas('pets', ['id' => $ownPet->id, 'litter_id' => $litter->id]);
    }

    public function test_stale_base_version_is_rejected_without_detaching(): void
    {
        $owner = User::factory()->create();
        [$litter, $target] = $this->createLitterWithMembers($owner, 3);

        $response = $this->actingAs($owner)->deleteJson(
            "/api/litters/{$litter->id}/members/{$target->id}",
            ['base_version' => '2000-01-01T00:00:00.000000Z']
        );

        $response->assertConflict();

        $this->assertDatabaseHas('litters', ['id' => $litter->id]);
        $this->assertDatabaseHas('pets', ['id' => $target->id, 'litter_id' => $litter->id]);
    }

    public function test_legitimate_removal_still_works(): void
    {
        $owner = User::factory()->create();
        [$litter, $target] = $this->createLitterWithMembers($owner, 3);

        $this->actingAs($owner)
            ->deleteJson("/api/litters/{$litter->id}/members/{$target->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('litters', ['id' => $litter->id]);
        $this->assertDatabaseHas('pets', ['id' => $target->id, 'litter_id' => null]);
    }
}
