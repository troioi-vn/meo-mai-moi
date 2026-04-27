<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PetStatus;
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
            'day_summary_mode' => 'sum',
            'pet_ids' => [$pet->id],
            'reminder_enabled' => true,
            'reminder_time' => '20:00',
            'reminder_weekdays' => [1, 3, 5],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.name', 'Play with cats')
            ->assertJsonPath('data.value_type', 'integer_scale')
            ->assertJsonPath('data.day_summary_mode', 'sum');

        $this->assertDatabaseHas('habits', [
            'name' => 'Play with cats',
            'created_by' => $owner->id,
            'day_summary_mode' => 'sum',
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

    public function test_heatmap_defaults_to_average_scored_pets(): void
    {
        $owner = User::factory()->create();
        $petA = $this->createPetWithOwner($owner);
        $petB = $this->createPetWithOwner($owner);

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
            'pet_id' => $petA->id,
            'entry_date' => '2026-04-01',
            'value_int' => 8,
            'updated_by_user_id' => $owner->id,
        ]);

        $response = $this->actingAs($owner)->getJson("/api/habits/{$habit->id}/heatmap?weeks=1&end_date=2026-04-01");

        $response
            ->assertOk()
            ->assertJsonPath('data.6.date', '2026-04-01')
            ->assertJsonPath('data.6.average_value', 8)
            ->assertJsonPath('data.6.display_value', 8)
            ->assertJsonPath('data.6.entry_count', 1)
            ->assertJsonPath('data.6.visible_pet_count', 2);
    }

    public function test_heatmap_can_average_all_visible_pets(): void
    {
        $owner = User::factory()->create();
        $petA = $this->createPetWithOwner($owner);
        $petB = $this->createPetWithOwner($owner);

        $habit = Habit::create([
            'created_by' => $owner->id,
            'name' => 'Play with cats',
            'value_type' => 'integer_scale',
            'scale_min' => 1,
            'scale_max' => 10,
            'day_summary_mode' => 'average_all_pets',
            'share_with_coowners' => false,
            'reminder_enabled' => false,
        ]);
        $habit->pets()->sync([$petA->id, $petB->id]);

        HabitEntry::create([
            'habit_id' => $habit->id,
            'pet_id' => $petA->id,
            'entry_date' => '2026-04-01',
            'value_int' => 8,
            'updated_by_user_id' => $owner->id,
        ]);

        $response = $this->actingAs($owner)->getJson("/api/habits/{$habit->id}/heatmap?weeks=1&end_date=2026-04-01");

        $response
            ->assertOk()
            ->assertJsonPath('data.6.average_value', 8)
            ->assertJsonPath('data.6.display_value', 4);
    }

    public function test_heatmap_can_sum_scores(): void
    {
        $owner = User::factory()->create();
        $petA = $this->createPetWithOwner($owner);
        $petB = $this->createPetWithOwner($owner);

        $habit = Habit::create([
            'created_by' => $owner->id,
            'name' => 'Play with cats',
            'value_type' => 'integer_scale',
            'scale_min' => 1,
            'scale_max' => 10,
            'day_summary_mode' => 'sum',
            'share_with_coowners' => false,
            'reminder_enabled' => false,
        ]);
        $habit->pets()->sync([$petA->id, $petB->id]);

        foreach ([[$petA->id, 8], [$petB->id, 6]] as [$petId, $value]) {
            HabitEntry::create([
                'habit_id' => $habit->id,
                'pet_id' => $petId,
                'entry_date' => '2026-04-01',
                'value_int' => $value,
                'updated_by_user_id' => $owner->id,
            ]);
        }

        $response = $this->actingAs($owner)->getJson("/api/habits/{$habit->id}/heatmap?weeks=1&end_date=2026-04-01");

        $response
            ->assertOk()
            ->assertJsonPath('data.6.average_value', 7)
            ->assertJsonPath('data.6.display_value', 14);
    }

    public function test_yes_no_heatmap_displays_yes_count(): void
    {
        $owner = User::factory()->create();
        $petA = $this->createPetWithOwner($owner);
        $petB = $this->createPetWithOwner($owner);
        $petC = $this->createPetWithOwner($owner);

        $habit = Habit::create([
            'created_by' => $owner->id,
            'name' => 'Play with cats',
            'value_type' => 'yes_no',
            'day_summary_mode' => 'sum',
            'share_with_coowners' => false,
            'reminder_enabled' => false,
        ]);
        $habit->pets()->sync([$petA->id, $petB->id, $petC->id]);

        foreach ([[$petA->id, 1], [$petB->id, 0], [$petC->id, 1]] as [$petId, $value]) {
            HabitEntry::create([
                'habit_id' => $habit->id,
                'pet_id' => $petId,
                'entry_date' => '2026-04-01',
                'value_int' => $value,
                'updated_by_user_id' => $owner->id,
            ]);
        }

        $response = $this->actingAs($owner)->getJson("/api/habits/{$habit->id}/heatmap?weeks=1&end_date=2026-04-01");

        $response
            ->assertOk()
            ->assertJsonPath('data.6.average_value', 0.67)
            ->assertJsonPath('data.6.display_value', 2)
            ->assertJsonPath('data.6.entry_count', 3);
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

    public function test_lost_or_deceased_pet_is_removed_from_habits_without_deleting_history(): void
    {
        foreach ([PetStatus::LOST, PetStatus::DECEASED] as $status) {
            $owner = User::factory()->create();
            $pet = $this->createPetWithOwner($owner, ['name' => 'Dasha']);

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

            HabitEntry::create([
                'habit_id' => $habit->id,
                'pet_id' => $pet->id,
                'entry_date' => '2026-04-01',
                'value_int' => 5,
                'updated_by_user_id' => $owner->id,
            ]);

            $response = $this->actingAs($owner)->putJson(route('pets.updateStatus', $pet), [
                'status' => $status->value,
            ]);

            $response
                ->assertOk()
                ->assertJsonPath('data.status', $status->value);

            $this->assertDatabaseMissing('habit_pet', [
                'habit_id' => $habit->id,
                'pet_id' => $pet->id,
            ]);
            $this->assertDatabaseHas('habit_entries', [
                'habit_id' => $habit->id,
                'pet_id' => $pet->id,
                'entry_date' => '2026-04-01',
                'value_int' => 5,
            ]);

            $dayResponse = $this->actingAs($owner)->getJson("/api/habits/{$habit->id}/entries/2026-04-01");

            $dayResponse
                ->assertOk()
                ->assertJsonFragment([
                    'pet_name' => 'Dasha',
                    'value_int' => 5,
                    'is_current_pet' => false,
                    'has_entry' => true,
                ]);
        }
    }

    public function test_removed_habit_pet_cannot_be_tracked_again_by_upsert(): void
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
        $habit->pets()->detach($pet->id);

        $response = $this->actingAs($owner)->putJson("/api/habits/{$habit->id}/entries/2026-04-01", [
            'entries' => [
                [
                    'pet_id' => $pet->id,
                    'value_int' => 7,
                ],
            ],
        ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('habit_entries', [
            'habit_id' => $habit->id,
            'pet_id' => $pet->id,
            'entry_date' => '2026-04-01',
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
