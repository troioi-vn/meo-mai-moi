<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Models\Notification;
use App\Models\Pet;
use App\Models\PetRelationship;
use App\Models\PetType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class BirthdayRemindersCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        PetType::factory()->create(['slug' => 'cat', 'name' => 'Cat', 'placement_requests_allowed' => true, 'weight_tracking_allowed' => true]);
    }

    public function test_command_sends_to_owners_and_editors_but_not_viewers()
    {
        $owner = User::factory()->create();
        $editor = User::factory()->create();
        $viewer = User::factory()->create();

        $petType = PetType::where('slug', 'cat')->first();
        $pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'pet_type_id' => $petType->id,
            'birthday' => now()->subYears(2)->toDateString(),
        ]);

        PetRelationship::factory()->active()->editor()->create([
            'pet_id' => $pet->id,
            'user_id' => $editor->id,
            'created_by' => $owner->id,
        ]);

        PetRelationship::factory()->active()->viewer()->create([
            'pet_id' => $pet->id,
            'user_id' => $viewer->id,
            'created_by' => $owner->id,
        ]);

        $exitCode = Artisan::call('reminders:birthdays');
        $this->assertEquals(0, $exitCode);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $owner->id,
            'type' => NotificationType::PET_BIRTHDAY->value,
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $editor->id,
            'type' => NotificationType::PET_BIRTHDAY->value,
        ]);

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $viewer->id,
            'type' => NotificationType::PET_BIRTHDAY->value,
        ]);
    }

    public function test_command_does_not_create_duplicate_in_app_birthday_notifications_when_run_twice_same_day()
    {
        $owner = User::factory()->create();

        $petType = PetType::where('slug', 'cat')->first();
        $pet = Pet::factory()->create([
            'created_by' => $owner->id,
            'pet_type_id' => $petType->id,
            'birthday' => now()->subYears(2)->toDateString(),
        ]);

        Artisan::call('reminders:birthdays');
        Artisan::call('reminders:birthdays');

        $birthdayBellNotifications = Notification::query()
            ->bellVisible()
            ->where('user_id', $owner->id)
            ->where('type', NotificationType::PET_BIRTHDAY->value)
            ->where('data->pet_id', $pet->id)
            ->count();

        $this->assertSame(1, $birthdayBellNotifications);
    }
}
