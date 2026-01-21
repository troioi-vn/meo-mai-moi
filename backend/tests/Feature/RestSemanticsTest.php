<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\HelperProfile;
use App\Models\Notification;
use App\Models\Pet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RestSemanticsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Pet $pet;

    private HelperProfile $helperProfile;

    private Notification $notification;

    private City $city;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->city = City::factory()->create(['country' => 'VN']);
        $this->pet = Pet::factory()->create(['created_by' => $this->user->id]);
        $this->helperProfile = HelperProfile::factory()->create([
            'user_id' => $this->user->id,
            'country' => $this->city->country,
            'city_id' => $this->city->id,
            'city' => $this->city->name,
        ]);
        $this->notification = Notification::factory()->create(['user_id' => $this->user->id]);

        Sanctum::actingAs($this->user);
    }

    #[Test]
    public function user_profile_update_requires_put_method()
    {
        $userData = [
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
        ];

        // PUT should work
        $response = $this->putJson('/api/users/me', $userData);
        $response->assertStatus(200);

        // POST should return 405 Method Not Allowed
        $response = $this->postJson('/api/users/me', $userData);
        $response->assertStatus(405);

        // PATCH should return 405 Method Not Allowed
        $response = $this->patchJson('/api/users/me', $userData);
        $response->assertStatus(405);
    }

    #[Test]
    public function user_password_update_requires_put_method()
    {
        $passwordData = [
            'current_password' => 'password',
            'new_password' => 'newpassword123',
            'new_password_confirmation' => 'newpassword123',
        ];

        // PUT should work
        $response = $this->putJson('/api/users/me/password', $passwordData);
        $response->assertStatus(204);

        // POST should return 405 Method Not Allowed
        $response = $this->postJson('/api/users/me/password', $passwordData);
        $response->assertStatus(405);

        // PATCH should return 405 Method Not Allowed
        $response = $this->patchJson('/api/users/me/password', $passwordData);
        $response->assertStatus(405);
    }

    #[Test]
    public function pet_update_requires_put_method()
    {
        // PUT should work
        $response = $this->putJson("/api/pets/{$this->pet->id}", ['name' => 'Updated Pet Name']);
        $response->assertStatus(200);

        // POST should return 405 Method Not Allowed
        $response = $this->postJson("/api/pets/{$this->pet->id}", ['name' => 'Updated Pet Name']);
        $response->assertStatus(405);

        // PATCH should return 405 Method Not Allowed
        $response = $this->patchJson("/api/pets/{$this->pet->id}", ['name' => 'Updated Pet Name']);
        $response->assertStatus(405);
    }

    #[Test]
    public function pet_status_update_requires_put_method()
    {
        $statusData = [
            'status' => 'lost',
            'password' => 'password',
        ];

        // PUT should work
        $response = $this->putJson("/api/pets/{$this->pet->id}/status", $statusData);
        $response->assertStatus(200);

        // POST should return 405 Method Not Allowed
        $response = $this->postJson("/api/pets/{$this->pet->id}/status", $statusData);
        $response->assertStatus(405);

        // PATCH should return 405 Method Not Allowed
        $response = $this->patchJson("/api/pets/{$this->pet->id}/status", $statusData);
        $response->assertStatus(405);
    }

    #[Test]
    public function notification_preferences_update_requires_put_method()
    {
        $preferencesData = [
            'preferences' => [
                [
                    'type' => 'placement_request_response',
                    'email_enabled' => true,
                    'in_app_enabled' => false,
                ],
            ],
        ];

        // PUT should work
        $response = $this->putJson('/api/notification-preferences', $preferencesData);
        $response->assertStatus(200);

        // POST should return 405 Method Not Allowed
        $response = $this->postJson('/api/notification-preferences', $preferencesData);
        $response->assertStatus(405);

        // PATCH should return 405 Method Not Allowed
        $response = $this->patchJson('/api/notification-preferences', $preferencesData);
        $response->assertStatus(405);
    }

    #[Test]
    public function individual_notification_read_requires_patch_method()
    {
        // PATCH should work
        $response = $this->patchJson("/api/notifications/{$this->notification->id}/read");
        $response->assertStatus(204);

        // Create another notification for testing other methods
        $notification2 = Notification::factory()->create(['user_id' => $this->user->id]);

        // POST should return 405 Method Not Allowed
        $response = $this->postJson("/api/notifications/{$notification2->id}/read");
        $response->assertStatus(405);

        // PUT should return 405 Method Not Allowed
        $response = $this->putJson("/api/notifications/{$notification2->id}/read");
        $response->assertStatus(405);
    }

    #[Test]
    public function helper_profile_update_supports_both_put_and_post_for_compatibility()
    {
        $newCity = City::factory()->create(['country' => 'VN']);
        $updateData = ['city_ids' => [$newCity->id]];

        // PUT should work (preferred method)
        $response = $this->putJson("/api/helper-profiles/{$this->helperProfile->id}", $updateData);
        $response->assertStatus(200);

        // POST should also work (deprecated but supported for HTML forms)
        $response = $this->postJson("/api/helper-profiles/{$this->helperProfile->id}", $updateData);
        $response->assertStatus(200);

        // PATCH should also work (from apiResource)
        $response = $this->patchJson("/api/helper-profiles/{$this->helperProfile->id}", $updateData);
        $response->assertStatus(200);
    }

    #[Test]
    public function bulk_notification_read_supports_post_methods()
    {
        // Both endpoints should work for marking all notifications as read

        // POST /notifications/mark-all-read (preferred)
        $response = $this->postJson('/api/notifications/mark-all-read');
        $response->assertStatus(204);

        // POST /notifications/mark-as-read (deprecated alias)
        $response = $this->postJson('/api/notifications/mark-as-read');
        $response->assertStatus(204);

        // Other methods should return 405
        $response = $this->putJson('/api/notifications/mark-all-read');
        $response->assertStatus(405);

        $response = $this->patchJson('/api/notifications/mark-all-read');
        $response->assertStatus(405);
    }

    #[Test]
    public function create_operations_require_post_method()
    {
        // Pet creation should require POST
        $petData = [
            'name' => 'New Pet',
            'age_years' => 2,
            'gender' => 'male',
            'status' => 'active',
            'birthday' => '2022-01-01',
            'country' => 'VN',
            'city_id' => $this->city->id,
            'description' => 'A lovely test pet',
        ];

        // POST should work
        $response = $this->postJson('/api/pets', $petData);
        $response->assertStatus(201);

        // PUT should return 405 Method Not Allowed
        $response = $this->putJson('/api/pets', $petData);
        $response->assertStatus(405);

        // PATCH should return 405 Method Not Allowed
        $response = $this->patchJson('/api/pets', $petData);
        $response->assertStatus(405);
    }

    #[Test]
    public function delete_operations_require_delete_method()
    {
        // DELETE should work (with password confirmation)
        $response = $this->deleteJson("/api/pets/{$this->pet->id}", ['password' => 'password']);
        $response->assertStatus(204);

        // Create another pet for testing other methods
        $pet2 = Pet::factory()->create(['created_by' => $this->user->id]);

        // POST should return 405 Method Not Allowed for delete endpoint
        $response = $this->postJson("/api/pets/{$pet2->id}/delete");
        $response->assertStatus(405); // Method not allowed

        // Test avatar deletion specifically (should work even if no avatar exists)
        $response = $this->deleteJson('/api/users/me/avatar');
        $response->assertStatus(404); // No avatar to delete

        // Test that wrong HTTP methods return 405 for existing endpoints
        $response = $this->getJson("/api/pets/{$pet2->id}");
        $response->assertStatus(200); // GET should work for show

        $response = $this->patchJson("/api/pets/{$pet2->id}", ['name' => 'Test']);
        $response->assertStatus(405); // PATCH should not work for pet updates
    }
}
