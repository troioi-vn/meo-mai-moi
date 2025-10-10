<?php

namespace Tests\Unit;

use App\Enums\NotificationType;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationPreferenceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_notification_preference_belongs_to_user()
    {
        $preference = NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        $this->assertInstanceOf(User::class, $preference->user);
        $this->assertEquals($this->user->id, $preference->user->id);
    }

    public function test_user_has_many_notification_preferences()
    {
        NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'email_enabled' => false,
            'in_app_enabled' => true,
        ]);

        $this->assertCount(2, $this->user->notificationPreferences);
    }

    public function test_get_preference_returns_existing_preference()
    {
        $created = NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => false,
            'in_app_enabled' => true,
        ]);

        $retrieved = NotificationPreference::getPreference(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value
        );

        $this->assertEquals($created->id, $retrieved->id);
        $this->assertFalse($retrieved->email_enabled);
        $this->assertTrue($retrieved->in_app_enabled);
    }

    public function test_get_preference_creates_default_when_not_exists()
    {
        $preference = NotificationPreference::getPreference(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value
        );

        $this->assertInstanceOf(NotificationPreference::class, $preference);
        $this->assertEquals($this->user->id, $preference->user_id);
        $this->assertEquals(NotificationType::PLACEMENT_REQUEST_RESPONSE->value, $preference->notification_type);
        $this->assertTrue($preference->email_enabled); // Default is true
        $this->assertTrue($preference->in_app_enabled); // Default is true
        $this->assertTrue($preference->exists); // Should be saved to database
    }

    public function test_update_preference_creates_new_preference()
    {
        NotificationPreference::updatePreference(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            false,
            true
        );

        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => false,
            'in_app_enabled' => true,
        ]);
    }

    public function test_update_preference_updates_existing_preference()
    {
        $preference = NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        NotificationPreference::updatePreference(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            false,
            false
        );

        $preference->refresh();
        $this->assertFalse($preference->email_enabled);
        $this->assertFalse($preference->in_app_enabled);

        // Should not create a new record
        $this->assertDatabaseCount('notification_preferences', 1);
    }

    public function test_unique_constraint_prevents_duplicate_preferences()
    {
        NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        $this->expectException(QueryException::class);

        NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => false,
            'in_app_enabled' => false,
        ]);
    }

    public function test_fillable_attributes()
    {
        $preference = new NotificationPreference();
        $fillable = $preference->getFillable();

        $this->assertContains('user_id', $fillable);
        $this->assertContains('notification_type', $fillable);
        $this->assertContains('email_enabled', $fillable);
        $this->assertContains('in_app_enabled', $fillable);
    }

    public function test_casts_boolean_attributes()
    {
        $preference = NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => '1',
            'in_app_enabled' => '0',
        ]);

        $this->assertIsBool($preference->email_enabled);
        $this->assertIsBool($preference->in_app_enabled);
        $this->assertTrue($preference->email_enabled);
        $this->assertFalse($preference->in_app_enabled);
    }

    public function test_get_all_preferences_for_user()
    {
        // Create preferences for different types
        foreach (NotificationType::cases() as $type) {
            NotificationPreference::create([
                'user_id' => $this->user->id,
                'notification_type' => $type->value,
                'email_enabled' => $type === NotificationType::PLACEMENT_REQUEST_RESPONSE,
                'in_app_enabled' => true,
            ]);
        }

        $preferences = NotificationPreference::getAllForUser($this->user);

        $this->assertCount(count(NotificationType::cases()), $preferences);

        // Verify each notification type is represented
        $types = $preferences->pluck('notification_type')->toArray();
        foreach (NotificationType::cases() as $type) {
            $this->assertContains($type->value, $types);
        }
    }

    public function test_get_all_preferences_for_user_creates_missing_defaults()
    {
        // Create only one preference
        NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => false,
            'in_app_enabled' => false,
        ]);

        $preferences = NotificationPreference::getAllForUser($this->user);

        // Should return all notification types with defaults for missing ones
        $this->assertCount(count(NotificationType::cases()), $preferences);

        // Check that the existing preference is preserved
        $existingPreference = $preferences->firstWhere('notification_type', NotificationType::PLACEMENT_REQUEST_RESPONSE->value);
        $this->assertFalse($existingPreference->email_enabled);
        $this->assertFalse($existingPreference->in_app_enabled);

        // Check that missing preferences have defaults
        $otherPreferences = $preferences->where('notification_type', '!=', NotificationType::PLACEMENT_REQUEST_RESPONSE->value);
        foreach ($otherPreferences as $preference) {
            $this->assertTrue($preference->email_enabled);
            $this->assertTrue($preference->in_app_enabled);
        }
    }

    public function test_scope_for_user()
    {
        $otherUser = User::factory()->create();

        NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        NotificationPreference::create([
            'user_id' => $otherUser->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => false,
            'in_app_enabled' => false,
        ]);

        $userPreferences = NotificationPreference::forUser($this->user)->get();
        $this->assertCount(1, $userPreferences);
        $this->assertEquals($this->user->id, $userPreferences->first()->user_id);
    }

    public function test_scope_for_type()
    {
        NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'email_enabled' => false,
            'in_app_enabled' => false,
        ]);

        $typePreferences = NotificationPreference::forType(NotificationType::PLACEMENT_REQUEST_RESPONSE->value)->get();
        $this->assertCount(1, $typePreferences);
        $this->assertEquals(NotificationType::PLACEMENT_REQUEST_RESPONSE->value, $typePreferences->first()->notification_type);
    }

    public function test_has_email_enabled_method()
    {
        $preference = NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => false,
        ]);

        $this->assertTrue($preference->hasEmailEnabled());

        $preference->update(['email_enabled' => false]);
        $this->assertFalse($preference->hasEmailEnabled());
    }

    public function test_has_in_app_enabled_method()
    {
        $preference = NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => false,
            'in_app_enabled' => true,
        ]);

        $this->assertTrue($preference->hasInAppEnabled());

        $preference->update(['in_app_enabled' => false]);
        $this->assertFalse($preference->hasInAppEnabled());
    }
}
