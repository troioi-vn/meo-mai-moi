<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\PetRelationshipType;
use App\Enums\PetStatus;
use App\Models\Habit;
use App\Models\HabitEntry;
use App\Models\PetRelationship;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class HabitFeatureTest extends TestCase
{
    public function test_owner_can_create_habit_for_owned_pets(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $response = $this->actingAs($owner)->postJson('/api/habits', [
            'name' => 'Play with cats',
            'timezone' => 'Asia/Ho_Chi_Minh',
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
            ->assertJsonPath('data.timezone', 'Asia/Ho_Chi_Minh')
            ->assertJsonPath('data.value_type', 'integer_scale')
            ->assertJsonPath('data.day_summary_mode', 'sum');

        $this->assertDatabaseHas('habits', [
            'name' => 'Play with cats',
            'created_by' => $owner->id,
            'timezone' => 'Asia/Ho_Chi_Minh',
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

    public function test_owner_can_create_habit_with_compact_gmt_timezone(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $response = $this->actingAs($owner)->postJson('/api/habits', [
            'name' => 'Evening meds',
            'timezone' => 'Etc/GMT-7',
            'value_type' => 'yes_no',
            'pet_ids' => [$pet->id],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.timezone', 'Etc/GMT-7')
            ->assertJsonPath('data.value_type', 'yes_no');

        $this->assertDatabaseHas('habits', [
            'name' => 'Evening meds',
            'created_by' => $owner->id,
            'timezone' => 'Etc/GMT-7',
        ]);
    }

    public function test_creator_can_update_linked_pets_for_habit(): void
    {
        $owner = User::factory()->create();
        $petA = $this->createPetWithOwner($owner, ['name' => 'Masha']);
        $petB = $this->createPetWithOwner($owner, ['name' => 'Dasha']);

        $habit = Habit::create([
            'created_by' => $owner->id,
            'name' => 'Play with cats',
            'value_type' => 'yes_no',
            'share_with_coowners' => false,
            'reminder_enabled' => false,
        ]);
        $habit->pets()->sync([$petA->id]);

        $response = $this->actingAs($owner)->putJson("/api/habits/{$habit->id}", [
            'pet_ids' => [$petB->id],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.pet_count', 1);

        $this->assertDatabaseMissing('habit_pet', [
            'habit_id' => $habit->id,
            'pet_id' => $petA->id,
        ]);
        $this->assertDatabaseHas('habit_pet', [
            'habit_id' => $habit->id,
            'pet_id' => $petB->id,
        ]);
    }

    public function test_shared_habit_co_owner_cannot_change_linked_pets(): void
    {
        $creator = User::factory()->create();
        $coOwner = User::factory()->create();
        $pet = $this->createPetWithOwner($creator, ['name' => 'Masha']);

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

        $response = $this->actingAs($coOwner)->putJson("/api/habits/{$habit->id}", [
            'pet_ids' => [$pet->id],
        ]);

        $response
            ->assertForbidden()
            ->assertJsonPath('message', __('messages.habits.only_creator_can_change_pet_list'));

        $this->assertDatabaseHas('habit_pet', [
            'habit_id' => $habit->id,
            'pet_id' => $pet->id,
        ]);
    }

    public function test_creator_can_update_habit_to_compact_gmt_timezone(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $habit = Habit::create([
            'created_by' => $owner->id,
            'name' => 'Play with cats',
            'timezone' => 'Asia/Ho_Chi_Minh',
            'value_type' => 'yes_no',
            'share_with_coowners' => false,
            'reminder_enabled' => false,
        ]);
        $habit->pets()->sync([$pet->id]);

        $response = $this->actingAs($owner)->putJson("/api/habits/{$habit->id}", [
            'timezone' => 'Etc/GMT+4',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.timezone', 'Etc/GMT+4');

        $this->assertDatabaseHas('habits', [
            'id' => $habit->id,
            'timezone' => 'Etc/GMT+4',
        ]);
    }

    public function test_creator_cannot_change_habit_value_type_after_creation(): void
    {
        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $habit = Habit::create([
            'created_by' => $owner->id,
            'name' => 'Play with cats',
            'timezone' => 'UTC',
            'value_type' => 'yes_no',
            'share_with_coowners' => false,
            'reminder_enabled' => false,
        ]);
        $habit->pets()->sync([$pet->id]);

        $response = $this->actingAs($owner)->putJson("/api/habits/{$habit->id}", [
            'value_type' => 'integer_scale',
            'scale_min' => 1,
            'scale_max' => 10,
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('message', __('messages.habits.value_type_locked'));

        $this->assertDatabaseHas('habits', [
            'id' => $habit->id,
            'value_type' => 'yes_no',
            'scale_min' => null,
            'scale_max' => null,
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

    public function test_habit_day_entries_allow_habit_local_today_even_if_server_is_next_day(): void
    {
        Carbon::setTestNow('2026-04-02 01:30:00 UTC');

        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $habit = Habit::create([
            'created_by' => $owner->id,
            'name' => 'Late night meds',
            'timezone' => 'America/Los_Angeles',
            'value_type' => 'integer_scale',
            'scale_min' => 1,
            'scale_max' => 10,
            'share_with_coowners' => false,
            'reminder_enabled' => false,
        ]);
        $habit->pets()->sync([$pet->id]);

        $response = $this->actingAs($owner)->putJson("/api/habits/{$habit->id}/entries/2026-04-01", [
            'entries' => [
                [
                    'pet_id' => $pet->id,
                    'value_int' => 7,
                ],
            ],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.date', '2026-04-01');

        $this->assertDatabaseHas('habit_entries', [
            'habit_id' => $habit->id,
            'pet_id' => $pet->id,
            'entry_date' => '2026-04-01',
            'value_int' => 7,
        ]);

        Carbon::setTestNow();
    }

    public function test_habit_day_entries_reject_tomorrow_in_habit_timezone_even_if_server_is_same_date(): void
    {
        Carbon::setTestNow('2026-04-01 13:30:00 UTC');

        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $habit = Habit::create([
            'created_by' => $owner->id,
            'name' => 'Morning routine',
            'timezone' => 'Asia/Ho_Chi_Minh',
            'value_type' => 'integer_scale',
            'scale_min' => 1,
            'scale_max' => 10,
            'share_with_coowners' => false,
            'reminder_enabled' => false,
        ]);
        $habit->pets()->sync([$pet->id]);

        $response = $this->actingAs($owner)->getJson("/api/habits/{$habit->id}/entries/2026-04-02");

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors(['date']);

        Carbon::setTestNow();
    }

    public function test_habit_reminder_uses_habit_timezone_for_due_date(): void
    {
        Notification::fake();
        Carbon::setTestNow('2026-04-01 13:00:00 UTC');

        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $habit = Habit::create([
            'created_by' => $owner->id,
            'name' => 'Dinner',
            'timezone' => 'Asia/Ho_Chi_Minh',
            'value_type' => 'yes_no',
            'share_with_coowners' => false,
            'reminder_enabled' => true,
            'reminder_time' => '20:00',
            'reminder_weekdays' => null,
        ]);
        $habit->pets()->sync([$pet->id]);

        Artisan::call('reminders:habits');

        $this->assertDatabaseHas('notifications', [
            'user_id' => $owner->id,
            'type' => 'habit_reminder',
        ]);

        $payload = json_decode((string) \DB::table('notifications')
            ->where('user_id', $owner->id)
            ->where('type', 'habit_reminder')
            ->orderBy('id')
            ->value('data'), true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame('2026-04-01', $payload['date']);
        $this->assertSame('/habits/'.$habit->id.'?date=2026-04-01', $payload['link']);

        Carbon::setTestNow();
    }

    public function test_pet_summary_ranks_yes_no_pets_by_days_since_last_yes(): void
    {
        Carbon::setTestNow('2026-04-08 09:00:00 UTC');
        $today = Carbon::now('UTC')->startOfDay();

        $owner = User::factory()->create();
        $petA = $this->createPetWithOwner($owner, ['name' => 'Alpha']);
        $petB = $this->createPetWithOwner($owner, ['name' => 'Bravo']);
        $petC = $this->createPetWithOwner($owner, ['name' => 'Charlie']);
        $petD = $this->createPetWithOwner($owner, ['name' => 'Delta']);

        $habit = Habit::create([
            'created_by' => $owner->id,
            'name' => 'Tooth brushing',
            'timezone' => 'UTC',
            'value_type' => 'yes_no',
            'share_with_coowners' => false,
            'reminder_enabled' => false,
        ]);
        $habit->pets()->sync([$petA->id, $petB->id, $petC->id, $petD->id]);

        // Oldest day first, matching the reference case: 7/7, 4/7, 0/7.
        $pattern = [
            $petA->id => [1, 1, 1, 1, 1, 1, 1],
            $petB->id => [1, 0, 1, 1, 1, 0, 0],
            $petC->id => [0, 0, 0, 0, 0, 0, 0],
        ];

        foreach ($pattern as $petId => $values) {
            foreach ($values as $index => $value) {
                HabitEntry::create([
                    'habit_id' => $habit->id,
                    'pet_id' => $petId,
                    'entry_date' => $today->copy()->subDays(6 - $index)->toDateString(),
                    'value_int' => $value,
                ]);
            }
        }

        $response = $this->actingAs($owner)->getJson("/api/habits/{$habit->id}/pet-summary");

        $response->assertOk();

        $rows = collect($response->json('data.pets'))->keyBy('pet_id');

        $this->assertSame(0, $rows[$petA->id]['days_since_last_yes']);
        $this->assertSame($today->toDateString(), $rows[$petA->id]['last_yes_date']);

        // Bravo's last 1 is two days back; the two trailing 0s must not count.
        $this->assertSame(2, $rows[$petB->id]['days_since_last_yes']);
        $this->assertSame($today->copy()->subDays(2)->toDateString(), $rows[$petB->id]['last_yes_date']);

        // Charlie has records every day, but never a yes.
        $this->assertNull($rows[$petC->id]['days_since_last_yes']);
        $this->assertNull($rows[$petC->id]['last_yes_date']);

        // Delta is linked to the habit but has no entries at all — it must still
        // appear, otherwise the never-tracked pet silently drops out of the ranking.
        $this->assertNull($rows[$petD->id]['days_since_last_yes']);
        $this->assertSame([], $rows[$petD->id]['series']);

        Carbon::setTestNow();
    }

    public function test_pet_summary_ignores_the_window_when_finding_the_last_yes(): void
    {
        Carbon::setTestNow('2026-04-08 09:00:00 UTC');
        $today = Carbon::now('UTC')->startOfDay();

        $owner = User::factory()->create();
        $pet = $this->createPetWithOwner($owner);

        $habit = Habit::create([
            'created_by' => $owner->id,
            'name' => 'Nail trim',
            'timezone' => 'UTC',
            'value_type' => 'yes_no',
            'share_with_coowners' => false,
            'reminder_enabled' => false,
        ]);
        $habit->pets()->sync([$pet->id]);

        HabitEntry::create([
            'habit_id' => $habit->id,
            'pet_id' => $pet->id,
            'entry_date' => $today->copy()->subDays(400)->toDateString(),
            'value_int' => 1,
        ]);

        $response = $this->actingAs($owner)->getJson("/api/habits/{$habit->id}/pet-summary?weeks=1");

        $response
            ->assertOk()
            ->assertJsonPath('data.pets.0.days_since_last_yes', 400);

        Carbon::setTestNow();
    }

    public function test_pet_summary_returns_windowed_series_per_pet_for_scale_habits(): void
    {
        Carbon::setTestNow('2026-04-08 09:00:00 UTC');
        $today = Carbon::now('UTC')->startOfDay();

        $owner = User::factory()->create();
        $petA = $this->createPetWithOwner($owner, ['name' => 'Alpha']);
        $petB = $this->createPetWithOwner($owner, ['name' => 'Bravo']);

        $habit = Habit::create([
            'created_by' => $owner->id,
            'name' => 'Playtime',
            'timezone' => 'UTC',
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
            'entry_date' => $today->copy()->subDays(2)->toDateString(),
            'value_int' => 4,
        ]);
        HabitEntry::create([
            'habit_id' => $habit->id,
            'pet_id' => $petA->id,
            'entry_date' => $today->toDateString(),
            'value_int' => 9,
        ]);
        HabitEntry::create([
            'habit_id' => $habit->id,
            'pet_id' => $petB->id,
            'entry_date' => $today->toDateString(),
            'value_int' => 2,
        ]);
        // Outside a one-week window.
        HabitEntry::create([
            'habit_id' => $habit->id,
            'pet_id' => $petA->id,
            'entry_date' => $today->copy()->subDays(30)->toDateString(),
            'value_int' => 1,
        ]);

        $response = $this->actingAs($owner)->getJson("/api/habits/{$habit->id}/pet-summary?weeks=1");

        $response->assertOk();

        $rows = collect($response->json('data.pets'))->keyBy('pet_id');

        $this->assertSame([
            ['date' => $today->copy()->subDays(2)->toDateString(), 'value' => 4],
            ['date' => $today->toDateString(), 'value' => 9],
        ], $rows[$petA->id]['series']);
        $this->assertSame([
            ['date' => $today->toDateString(), 'value' => 2],
        ], $rows[$petB->id]['series']);

        // Scale habits carry no last-yes ranking.
        $this->assertNull($rows[$petA->id]['days_since_last_yes']);

        Carbon::setTestNow();
    }

    public function test_pet_summary_only_shows_pets_a_co_owner_owns(): void
    {
        Carbon::setTestNow('2026-04-08 09:00:00 UTC');

        $creator = User::factory()->create();
        $coOwner = User::factory()->create();
        $creatorPet = $this->createPetWithOwner($creator, ['name' => 'Masha']);
        $sharedPet = $this->createPetWithOwner($creator, ['name' => 'Dasha']);

        PetRelationship::create([
            'pet_id' => $sharedPet->id,
            'user_id' => $coOwner->id,
            'relationship_type' => PetRelationshipType::OWNER,
            'start_at' => now(),
            'created_by' => $creator->id,
        ]);

        $habit = Habit::create([
            'created_by' => $creator->id,
            'name' => 'Tooth brushing',
            'timezone' => 'UTC',
            'value_type' => 'yes_no',
            'share_with_coowners' => true,
            'reminder_enabled' => false,
        ]);
        $habit->pets()->sync([$creatorPet->id, $sharedPet->id]);

        $response = $this->actingAs($coOwner)->getJson("/api/habits/{$habit->id}/pet-summary");

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data.pets')
            ->assertJsonPath('data.pets.0.pet_id', $sharedPet->id);

        Carbon::setTestNow();
    }
}
