<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use App\Models\VaccinationRecord;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class VaccinationRemindersCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Ensure pet types exist in test DB
        PetType::factory()->create(['slug' => 'cat', 'name' => 'Cat', 'placement_requests_allowed' => true, 'weight_tracking_allowed' => true]);
        PetType::factory()->create(['slug' => 'dog', 'name' => 'Dog', 'placement_requests_allowed' => false, 'weight_tracking_allowed' => false]);
    }

    public function test_command_sends_reminder_and_marks_record()
    {
        $user = User::factory()->create();
        $petType = PetType::where('slug', 'cat')->first();
        $pet = Pet::factory()->create(['user_id' => $user->id, 'pet_type_id' => $petType->id]);

        $record = VaccinationRecord::factory()->create([
            'pet_id' => $pet->id,
            'vaccine_name' => 'Rabies',
            'administered_at' => now()->subYear(),
            'due_at' => now()->addDay(),
            'reminder_sent_at' => null,
        ]);

        // Ensure preferences default to enabled
        $pref = NotificationPreference::getPreference($user, NotificationType::VACCINATION_REMINDER->value);
        $this->assertTrue($pref->email_enabled);
        $this->assertTrue($pref->in_app_enabled);

        $exitCode = Artisan::call('reminders:vaccinations', ['--days' => 3]);
        $this->assertEquals(0, $exitCode);

        $record->refresh();
        $this->assertNotNull($record->reminder_sent_at);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => NotificationType::VACCINATION_REMINDER->value,
        ]);
    }

    public function test_command_is_idempotent_per_record()
    {
        $user = User::factory()->create();
        $petType = PetType::where('slug', 'cat')->first();
        $pet = Pet::factory()->create(['user_id' => $user->id, 'pet_type_id' => $petType->id]);

        $record = VaccinationRecord::factory()->create([
            'pet_id' => $pet->id,
            'vaccine_name' => 'Rabies',
            'administered_at' => now()->subYear(),
            'due_at' => now()->addDay(),
            'reminder_sent_at' => null,
        ]);

        Artisan::call('reminders:vaccinations', ['--days' => 3]);
        $countAfterFirst = Notification::where('user_id', $user->id)
            ->where('type', NotificationType::VACCINATION_REMINDER->value)
            ->count();

        // Run again; should not create additional notifications for the same record
        Artisan::call('reminders:vaccinations', ['--days' => 3]);
        $countAfterSecond = Notification::where('user_id', $user->id)
            ->where('type', NotificationType::VACCINATION_REMINDER->value)
            ->count();

        $this->assertGreaterThanOrEqual(1, $countAfterFirst);
        $this->assertEquals($countAfterFirst, $countAfterSecond);
    }

    public function test_command_respects_capability_gating()
    {
        $user = User::factory()->create();
        $dogType = PetType::where('slug', 'dog')->first();
        $pet = Pet::factory()->create(['user_id' => $user->id, 'pet_type_id' => $dogType->id]);

        $record = VaccinationRecord::factory()->create([
            'pet_id' => $pet->id,
            'vaccine_name' => 'Rabies',
            'administered_at' => now()->subYear(),
            'due_at' => now()->addDay(),
            'reminder_sent_at' => null,
        ]);

        Artisan::call('reminders:vaccinations', ['--days' => 3]);

        // No notifications should be created for dogs (vaccinations disabled)
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $user->id,
            'type' => NotificationType::VACCINATION_REMINDER->value,
        ]);

        $record->refresh();
        $this->assertNull($record->reminder_sent_at);
    }
}
