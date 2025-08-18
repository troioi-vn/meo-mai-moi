<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationPreferenceIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_complete_notification_preference_workflow()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // 1. Get initial preferences (should be defaults)
        $response = $this->getJson('/api/notification-preferences');
        $response->assertStatus(200);
        
        $initialPreferences = $response->json('data');
        $this->assertCount(count(NotificationType::cases()), $initialPreferences);
        
        // All should be enabled by default
        foreach ($initialPreferences as $preference) {
            $this->assertTrue($preference['email_enabled']);
            $this->assertTrue($preference['in_app_enabled']);
        }

        // 2. Update some preferences
        $updatedPreferences = [
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
            'preferences' => $updatedPreferences
        ]);
        
        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Notification preferences updated successfully'
        ]);

        // 3. Verify preferences were saved
        $response = $this->getJson('/api/notification-preferences');
        $response->assertStatus(200);
        
        $preferences = $response->json('data');
        
        $placementRequestResponse = collect($preferences)->firstWhere('type', NotificationType::PLACEMENT_REQUEST_RESPONSE->value);
        $helperResponseAccepted = collect($preferences)->firstWhere('type', NotificationType::HELPER_RESPONSE_ACCEPTED->value);
        
        $this->assertFalse($placementRequestResponse['email_enabled']);
        $this->assertTrue($placementRequestResponse['in_app_enabled']);
        
        $this->assertTrue($helperResponseAccepted['email_enabled']);
        $this->assertFalse($helperResponseAccepted['in_app_enabled']);

        // 4. Verify database state
        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => false,
            'in_app_enabled' => true,
        ]);

        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $user->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'email_enabled' => true,
            'in_app_enabled' => false,
        ]);

        // 5. Update preferences again to test modification
        $secondUpdate = [
            [
                'type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
                'email_enabled' => true,
                'in_app_enabled' => false,
            ],
        ];

        $response = $this->putJson('/api/notification-preferences', [
            'preferences' => $secondUpdate
        ]);
        
        $response->assertStatus(200);

        // 6. Verify the update
        $response = $this->getJson('/api/notification-preferences');
        $preferences = $response->json('data');
        
        $placementRequestResponse = collect($preferences)->firstWhere('type', NotificationType::PLACEMENT_REQUEST_RESPONSE->value);
        
        $this->assertTrue($placementRequestResponse['email_enabled']);
        $this->assertFalse($placementRequestResponse['in_app_enabled']);

        // Should have the records we created/updated
        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $user->id,
            'notification_type' => NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            'email_enabled' => true,
            'in_app_enabled' => false,
        ]);
    }

    public function test_notification_preference_model_methods_work_correctly()
    {
        $user = User::factory()->create();
        
        // Test default behavior (no preferences exist)
        $this->assertTrue(NotificationPreference::isEmailEnabled($user, NotificationType::PLACEMENT_REQUEST_RESPONSE->value));
        $this->assertTrue(NotificationPreference::isInAppEnabled($user, NotificationType::PLACEMENT_REQUEST_RESPONSE->value));
        
        // Create a preference
        NotificationPreference::updatePreference(
            $user,
            NotificationType::PLACEMENT_REQUEST_RESPONSE->value,
            false,
            true
        );
        
        // Test the preference is applied
        $this->assertFalse(NotificationPreference::isEmailEnabled($user, NotificationType::PLACEMENT_REQUEST_RESPONSE->value));
        $this->assertTrue(NotificationPreference::isInAppEnabled($user, NotificationType::PLACEMENT_REQUEST_RESPONSE->value));
        
        // Test getPreference method
        $preference = NotificationPreference::getPreference($user, NotificationType::HELPER_RESPONSE_ACCEPTED->value);
        $this->assertTrue($preference->email_enabled);
        $this->assertTrue($preference->in_app_enabled);
        
        // Test that it creates the preference if it doesn't exist
        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $user->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);
    }
}