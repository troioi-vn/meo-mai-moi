<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PetRelationshipType;
use App\Models\Habit;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\User;
use Carbon\Carbon;
use Tests\TestCase;

class HabitCoOwnerMetadataGateTest extends TestCase
{
    /**
     * @return array{0: User, 1: User, 2: Pet, 3: Habit}
     */
    private function createSharedHabit(): array
    {
        $creator = User::factory()->create();
        $coOwner = User::factory()->create();
        $pet = $this->createPetWithOwner($creator);

        PetRelationship::create([
            'pet_id' => $pet->id,
            'user_id' => $coOwner->id,
            'relationship_type' => PetRelationshipType::OWNER,
            'start_at' => now(),
            'created_by' => $creator->id,
        ]);

        $habit = Habit::create([
            'created_by' => $creator->id,
            'name' => 'Play with cats',
            'value_type' => 'yes_no',
            'share_with_coowners' => true,
            'reminder_enabled' => false,
        ]);
        $habit->pets()->sync([$pet->id]);

        return [$creator, $coOwner, $pet, $habit];
    }

    public function test_co_owner_cannot_change_habit_metadata(): void
    {
        [, $coOwner, , $habit] = $this->createSharedHabit();

        $response = $this->actingAs($coOwner)->putJson("/api/habits/{$habit->id}", [
            'name' => 'Rewritten by co-owner',
            'reminder_enabled' => true,
            'reminder_time' => '03:00',
            'reminder_weekdays' => [0, 1, 2, 3, 4, 5, 6],
            'share_with_coowners' => false,
        ]);

        $response->assertForbidden();

        $this->assertDatabaseHas('habits', [
            'id' => $habit->id,
            'name' => 'Play with cats',
            'reminder_enabled' => false,
            'share_with_coowners' => true,
        ]);
    }

    public function test_creator_can_still_change_habit_metadata(): void
    {
        [$creator, , , $habit] = $this->createSharedHabit();

        $response = $this->actingAs($creator)->putJson("/api/habits/{$habit->id}", [
            'name' => 'Renamed by creator',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.name', 'Renamed by creator');
    }

    public function test_co_owner_can_still_record_day_entries(): void
    {
        [, $coOwner, $pet, $habit] = $this->createSharedHabit();
        $date = Carbon::now()->subDay()->toDateString();

        $response = $this->actingAs($coOwner)->putJson("/api/habits/{$habit->id}/entries/{$date}", [
            'entries' => [
                ['pet_id' => $pet->id, 'value_int' => 1],
            ],
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('habit_entries', [
            'habit_id' => $habit->id,
            'pet_id' => $pet->id,
            'entry_date' => $date,
            'value_int' => 1,
        ]);
    }
}
