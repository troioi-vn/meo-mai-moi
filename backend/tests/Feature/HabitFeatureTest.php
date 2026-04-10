<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Habit;
use App\Models\HabitEntry;
use App\Models\User;
use Tests\TestCase;

class HabitFeatureTest extends TestCase
{
    public function test_owner_can_create_habit_for_owned_pets(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $response = $this->actingAs($owner)->postJson('/api/habits', [
            'name' => 'Play with cats',
            'value_type' => 'integer_scale',
            'scale_min' => 1,
            'scale_max' => 10,
            'pet_ids' => [$pet->id],
            'reminder_enabled' => true,
            'reminder_time' => '20:00',
            'reminder_weekdays' => [1, 3, 5],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.name', 'Play with cats')
            ->assertJsonPath('data.value_type', 'integer_scale');

        $this->assertDatabaseHas('habits', [
            'name' => 'Play with cats',
            'created_by' => $owner->id,
        ]);
        $this->assertDatabaseHas('habit_pet', [
            'pet_id' => $pet->id,
        ]);
    }

    public function test_user_cannot_create_habit_for_pet_they_do_not_own(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $response = $this->actingAs($otherUser)->postJson('/api/habits', [
            'name' => 'Secret habit',
            'value_type' => 'yes_no',
            'pet_ids' => [$pet->id],
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('habits', [
            'name' => 'Secret habit',
        ]);
    }

    public function test_day_editor_keeps_historical_removed_pets_visible_to_creator(): void
    {
        $owner = User::factory()->create();
        $petA = $this->createPetWithOwner($owner, ['name' => 'Masha']);
        $petB = $this->createPetWithOwner($owner, ['name' => 'Dasha']);

        $habit = Habit::create([
            'created_by' => $owner->id,
            'name' => 'Play with cats',
            'value_type' => 'integer_scale',
            'scale_min' => 1,
            'scale_max' => 10,
            'share_with_coowners' => false,
            'reminder_enabled' => false,
        ]);
        $habit->pets()->sync([$petA->id, $petB->id]);

        HabitEntry::create([
            'habit_id' => $habit->id,
            'pet_id' => $petB->id,
            'entry_date' => '2026-04-01',
            'value_int' => 5,
            'updated_by_user_id' => $owner->id,
        ]);

        $habit->pets()->sync([$petA->id]);

        $response = $this->actingAs($owner)->getJson("/api/habits/{$habit->id}/entries/2026-04-01");

        $response->assertOk();
        $response->assertJsonPath('data.date', '2026-04-01');
        $response->assertJsonCount(2, 'data.entries');
        $response->assertJsonFragment([
            'pet_name' => 'Masha',
            'has_entry' => false,
            'is_current_pet' => true,
        ]);
        $response->assertJsonFragment([
            'pet_name' => 'Dasha',
            'value_int' => 5,
            'is_current_pet' => false,
            'has_entry' => true,
        ]);
    }

    public function test_user_cannot_fetch_future_habit_day_entries(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $habit = Habit::create([
            'created_by' => $owner->id,
            'name' => 'Play with cats',
            'value_type' => 'integer_scale',
            'scale_min' => 1,
            'scale_max' => 10,
            'share_with_coowners' => false,
            'reminder_enabled' => false,
        ]);
        $habit->pets()->sync([$pet->id]);

        $response = $this->actingAs($owner)->getJson("/api/habits/{$habit->id}/entries/2999-01-01");

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['date']);
    }

    public function test_user_cannot_save_future_habit_day_entries(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $habit = Habit::create([
            'created_by' => $owner->id,
            'name' => 'Play with cats',
            'value_type' => 'integer_scale',
            'scale_min' => 1,
            'scale_max' => 10,
            'share_with_coowners' => false,
            'reminder_enabled' => false,
        ]);
        $habit->pets()->sync([$pet->id]);

        $response = $this->actingAs($owner)->putJson("/api/habits/{$habit->id}/entries/2999-01-01", [
            'entries' => [
                [
                    'pet_id' => $pet->id,
                    'value_int' => 7,
                ],
            ],
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['date']);

        $this->assertDatabaseMissing('habit_entries', [
            'habit_id' => $habit->id,
            'pet_id' => $pet->id,
            'entry_date' => '2999-01-01',
        ]);
    }
}
