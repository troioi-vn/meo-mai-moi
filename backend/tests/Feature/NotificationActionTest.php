<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\City;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationActionTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_unapprove_city_from_notification_action(): void
    {
        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder']);

        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $city = City::factory()->create(['approved_at' => now()]);

        $notification = Notification::factory()->create([
            'user_id' => $admin->id,
            'type' => 'city_created',
            'message' => 'New city created',
            'link' => "/admin/cities/{$city->id}/edit",
            'read_at' => null,
            'data' => [
                'channel' => 'in_app',
                'city_id' => $city->id,
            ],
        ]);

        $response = $this->postJson("/api/notifications/{$notification->id}/actions/unapprove");

        $response->assertStatus(200);
        $response->assertJsonPath('data.unread_bell_count', 0);
        $response->assertJsonPath('data.notification.read_at', fn ($v) => is_string($v) && $v !== '');

        $this->assertDatabaseHas('cities', [
            'id' => $city->id,
            'approved_at' => null,
        ]);

        $this->assertDatabaseMissing('notifications', [
            'id' => $notification->id,
            'read_at' => null,
        ]);

        // After unapproving, the action should be disabled.
        $response->assertJsonPath('data.notification.actions.0.disabled', true);
    }

    public function test_non_admin_cannot_unapprove_city_from_notification_action(): void
    {
        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder']);

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $city = City::factory()->create(['approved_at' => now()]);

        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'type' => 'city_created',
            'message' => 'New city created',
            'link' => "/admin/cities/{$city->id}/edit",
            'read_at' => null,
            'data' => [
                'channel' => 'in_app',
                'city_id' => $city->id,
            ],
        ]);

        $response = $this->postJson("/api/notifications/{$notification->id}/actions/unapprove");

        $response->assertStatus(403);

        $this->assertDatabaseHas('cities', [
            'id' => $city->id,
            'approved_at' => $city->approved_at,
        ]);

        $this->assertDatabaseHas('notifications', [
            'id' => $notification->id,
            'read_at' => null,
        ]);
    }
}
