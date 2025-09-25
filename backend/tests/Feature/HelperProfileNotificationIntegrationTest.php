<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Events\HelperProfileStatusUpdated;
use App\Models\HelperProfile;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class HelperProfileNotificationIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
    }

    public function test_helper_profile_approval_triggers_email_notification()
    {
        // Create user and helper profile
        $user = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create([
            'user_id' => $user->id,
            'approval_status' => 'pending',
        ]);

        // Enable email notifications for the user
        NotificationPreference::create([
            'user_id' => $user->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        // Update helper profile to approved (this should trigger the event)
        $helperProfile->approval_status = 'approved';
        $helperProfile->save();

        // Fire the event manually (since we're not using the actual admin interface)
        event(new HelperProfileStatusUpdated($helperProfile));

        // Verify notification was created
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
        ]);
    }

    public function test_helper_profile_rejection_triggers_email_notification()
    {
        // Create user and helper profile
        $user = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create([
            'user_id' => $user->id,
            'approval_status' => 'pending',
        ]);

        // Enable email notifications for the user
        NotificationPreference::create([
            'user_id' => $user->id,
            'notification_type' => NotificationType::HELPER_RESPONSE_REJECTED->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
        ]);

        // Update helper profile to rejected (this should trigger the event)
        $helperProfile->approval_status = 'rejected';
        $helperProfile->save();

        // Fire the event manually (since we're not using the actual admin interface)
        event(new HelperProfileStatusUpdated($helperProfile));

        // Verify notification was created
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => NotificationType::HELPER_RESPONSE_REJECTED->value,
        ]);
    }

    public function test_helper_profile_other_status_uses_fallback_notification()
    {
        // Create user and helper profile
        $user = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create([
            'user_id' => $user->id,
            'approval_status' => 'pending',
        ]);

        // Update helper profile to suspended (this should use fallback)
        $helperProfile->approval_status = 'suspended';
        $helperProfile->save();

        // Fire the event manually
        event(new HelperProfileStatusUpdated($helperProfile));

        // Verify notification was created with fallback method (no specific type)
        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'message' => 'Your helper profile has been suspended.',
        ]);

        // Verify it doesn't have a specific notification type
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $user->id,
            'type' => NotificationType::HELPER_RESPONSE_ACCEPTED->value,
        ]);

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $user->id,
            'type' => NotificationType::HELPER_RESPONSE_REJECTED->value,
        ]);
    }
}
