<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationPreferenceApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_unauthenticated_user_cannot_access_preferences()
    {
        $response = $this->getJson('/api/notification-preferences');
        $response->assertStatus(401);

        $response = $this->putJson('/api/notification-preferences', []);
        $response->assertStatus(401);
    }

    public function test_get_notification_preferences_returns_all_types_with_defaults()
    {
        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/notification-preferences');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'type',
                    'label',
                    'group',
                    'email_enabled',
                    'in_app_enabled',
                ],
            ],
        ]);

        $data = $response->json('data');
        $data = $response->json('data');
        // We filter out EMAIL_VERIFICATION so expect one less
        $this->assertCount(count(NotificationType::cases()) - 1, $data);

        // Check that all notification types are present except EMAIL_VERIFICATION
        $types = array_column($data, 'type');
        foreach (NotificationType::cases() as $type) {
            if ($type === NotificationType::EMAIL_VERIFICATION) {
                $this->assertNotContains($type->value, $types);
            } else {
                $this->assertContains($type->value, $types);
            }
        }

        // Check default values (should be true for both email and in-app)
        foreach ($data as $preference) {
            $this->assertTrue($preference['email_enabled']);
            $this->assertTrue($preference['in_app_enabled']);
        }
    }

    public function test_get_notification_preferences_returns_existing_preferences()
    {
        Sanctum::actingAs($this->user);

        // Create some existing preferences
        NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => false,
            'in_app_enabled' => true,
        ]);

        NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'email_enabled' => true,
            'in_app_enabled' => false,
        ]);

        $response = $this->getJson('/api/notification-preferences');

        $response->assertStatus(200);
        $data = $response->json('data');

        // Find the specific preferences
        $placementRequestResponse = collect($data)->firstWhere('type', NotificationType::PLACEMENT_REQUEST_RESPONSE->value);
        $helperResponseAccepted = collect($data)->firstWhere('type', NotificationType::HELPER_RESPONSE_ACCEPTED->value);

        $this->assertFalse($placementRequestResponse['email_enabled']);
        $this->assertTrue($placementRequestResponse['in_app_enabled']);

        $this->assertTrue($helperResponseAccepted['email_enabled']);
        $this->assertFalse($helperResponseAccepted['in_app_enabled']);
    }

    public function test_update_notification_preferences_success()
    {
        Sanctum::actingAs($this->user);

        $preferences = [
            [
                'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
                'email_enabled' => false,
                'in_app_enabled' => true,
            ],
            [
                'type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
                'email_enabled' => true,
                'in_app_enabled' => false,
            ],
        ];

        $response = $this->putJson('/api/notification-preferences', [
            'preferences' => $preferences,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Notification preferences updated successfully',
        ]);

        // Verify preferences were saved to database
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

    public function test_update_notification_preferences_updates_existing_records()
    {
        Sanctum::actingAs($this->user);

        // Create existing preference
        $existingPreference = NotificationPreference::create([
            'user_id' => $this->user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        $preferences = [
            [
                'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
                'email_enabled' => false,
                'in_app_enabled' => false,
            ],
        ];

        $response = $this->putJson('/api/notification-preferences', [
            'preferences' => $preferences,
        ]);

        $response->assertStatus(200);

        // Verify the existing record was updated, not a new one created
        $this->assertDatabaseCount('notification_preferences', 1);
        $existingPreference->refresh();
        $this->assertFalse($existingPreference->email_enabled);
        $this->assertFalse($existingPreference->in_app_enabled);
    }

    public function test_update_notification_preferences_validation_errors()
    {
        Sanctum::actingAs($this->user);

        // Test missing preferences array
        $response = $this->putJson('/api/notification-preferences', []);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['preferences']);

        // Test invalid notification type
        $response = $this->putJson('/api/notification-preferences', [
            'preferences' => [
                [
                    'type' => 'invalid_type',
                    'email_enabled' => true,
                    'in_app_enabled' => true,
                ],
            ],
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['preferences.0.type']);

        // Test missing required fields
        $response = $this->putJson('/api/notification-preferences', [
            'preferences' => [
                [
                    'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
                    // missing email_enabled and in_app_enabled
                ],
            ],
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'preferences.0.email_enabled',
            'preferences.0.in_app_enabled',
        ]);

        // Test invalid boolean values
        $response = $this->putJson('/api/notification-preferences', [
            'preferences' => [
                [
                    'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
                    'email_enabled' => 'not_boolean',
                    'in_app_enabled' => 'also_not_boolean',
                ],
            ],
        ]);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'preferences.0.email_enabled',
            'preferences.0.in_app_enabled',
        ]);
    }

    public function test_update_notification_preferences_empty_array()
    {
        Sanctum::actingAs($this->user);

        $response = $this->putJson('/api/notification-preferences', [
            'preferences' => [],
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Notification preferences updated successfully',
        ]);

        // No preferences should be created
        $this->assertDatabaseCount('notification_preferences', 0);
    }

    public function test_notification_preference_labels_and_groups_are_correct()
    {
        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/notification-preferences');
        $response->assertStatus(200);

        $data = $response->json('data');

        foreach ($data as $preference) {
            $type = NotificationType::from($preference['type']);
            $this->assertEquals($type->getLabel(), $preference['label']);
            $this->assertEquals($type->getGroup(), $preference['group']);
        }
    }

    public function test_user_can_only_access_their_own_preferences()
    {
        $otherUser = User::factory()->create();

        // Create preference for other user
        NotificationPreference::create([
            'user_id' => $otherUser->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => false,
            'in_app_enabled' => false,
        ]);

        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/notification-preferences');
        $response->assertStatus(200);

        $data = $response->json('data');

        // Should get default preferences (true, true) not the other user's preferences
        $placementRequestResponse = collect($data)->firstWhere('type', NotificationType::PLACEMENT_REQUEST_RESPONSE->value);
        $this->assertTrue($placementRequestResponse['email_enabled']);
        $this->assertTrue($placementRequestResponse['in_app_enabled']);
    }
}
