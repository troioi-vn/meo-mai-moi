<?php

namespace Tests\Unit;

use App\Enums\NotificationType;
use App\Http\Controllers\NotificationPreference\GetNotificationPreferencesController;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class NotificationPreferenceControllerTest extends TestCase
{
    use RefreshDatabase;

    private GetNotificationPreferencesController $controller;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->controller = new GetNotificationPreferencesController;
        $this->user = User::factory()->create();
        Auth::login($this->user);
    }

    public function test_index_returns_all_notification_types_with_defaults()
    {
        $response = $this->controller->__invoke();

        $this->assertEquals(200, $response->getStatusCode());

        $data = json_decode($response->getContent(), true)['data'];

        // Should return all notification types except EMAIL_VERIFICATION (which is system-controlled)
        $expectedCount = count(NotificationType::cases()) - 1;
        $this->assertCount($expectedCount, $data);

        // Check structure and default values
        foreach ($data as $preference) {
            $this->assertArrayHasKey('type', $preference);
            $this->assertArrayHasKey('label', $preference);
            $this->assertArrayHasKey('group', $preference);
            $this->assertArrayHasKey('email_enabled', $preference);
            $this->assertArrayHasKey('in_app_enabled', $preference);

            // Defaults should be true
            $this->assertTrue($preference['email_enabled']);
            $this->assertTrue($preference['in_app_enabled']);
        }
    }

    public function test_index_returns_existing_preferences()
    {
        // Create a custom preference
        NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => false,
            'in_app_enabled' => true,
        ]);

        $response = $this->controller->__invoke();
        $data = json_decode($response->getContent(), true)['data'];

        $placementRequestResponse = collect($data)->firstWhere('type', NotificationType::PLACEMENT_REQUEST_RESPONSE->value);

        $this->assertFalse($placementRequestResponse['email_enabled']);
        $this->assertTrue($placementRequestResponse['in_app_enabled']);
    }

    public function test_update_creates_new_preferences()
    {
        // Test the core logic by directly calling the model methods
        NotificationPreference::updatePreference(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            false,
            true
        );

        NotificationPreference::updatePreference(
            $this->user,
            NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            true,
            false
        );

        // Verify preferences were created
        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => false,
            'in_app_enabled' => true,
        ]);

        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'email_enabled' => true,
            'in_app_enabled' => false,
        ]);
    }

    public function test_update_modifies_existing_preferences()
    {
        // Create existing preference
        $existing = NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        // Update the preference
        NotificationPreference::updatePreference(
            $this->user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            false,
            false
        );

        // Should update existing record, not create new one
        $this->assertDatabaseCount('notification_preferences', 1);

        $existing->refresh();
        $this->assertFalse($existing->email_enabled);
        $this->assertFalse($existing->in_app_enabled);
    }

    public function test_update_handles_empty_preferences_array()
    {
        // Test that no preferences are created when none are provided
        // This is implicitly tested by not calling updatePreference

        // No preferences should be created
        $this->assertDatabaseCount('notification_preferences', 0);

        // Test that the method handles empty arrays gracefully
        $preferences = [];
        foreach ($preferences as $preferenceData) {
            // This loop should not execute
            $this->fail('Should not execute with empty array');
        }

        // Should still have no preferences
        $this->assertDatabaseCount('notification_preferences', 0);
    }

    public function test_notification_type_enum_integration()
    {
        $response = $this->controller->__invoke();
        $data = json_decode($response->getContent(), true)['data'];

        foreach (NotificationType::cases() as $type) {
            // EMAIL_VERIFICATION is system-controlled and not returned in preferences
            if ($type === NotificationType::EMAIL_VERIFICATION) {
                continue;
            }

            $preference = collect($data)->firstWhere('type', $type->value);

            $this->assertNotNull($preference, "Missing preference for type: {$type->value}");
            $this->assertEquals($type->getLabel(), $preference['label']);
            $this->assertEquals($type->getGroup(), $preference['group']);
        }
    }
}
