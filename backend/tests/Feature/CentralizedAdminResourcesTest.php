<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\ResourceInvitationStatus;
use App\Enums\ResourceInvitationType;
use App\Filament\Resources\HabitResource;
use App\Filament\Resources\ResourceInvitationResource;
use App\Models\Habit;
use App\Models\ResourceInvitation;
use App\Models\User;
use App\Services\ResourceInvitationService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Tests\TestCase;

class CentralizedAdminResourcesTest extends TestCase
{
    public function test_only_admin_roles_can_access_centralized_resources(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $this->actingAs($admin);

        $this->assertTrue(HabitResource::canAccess());
        $this->assertTrue(ResourceInvitationResource::canAccess());
        $this->assertFalse(HabitResource::canCreate());
        $this->assertFalse(ResourceInvitationResource::canCreate());

        $regularUser = User::factory()->create();
        $this->actingAs($regularUser);

        $this->assertFalse(HabitResource::canAccess());
        $this->assertFalse(ResourceInvitationResource::canAccess());
    }

    public function test_resource_invitation_service_revokes_only_pending_unexpired_invitation(): void
    {
        $inviter = User::factory()->create();
        $invitation = ResourceInvitation::query()->create([
            'type' => ResourceInvitationType::LEDGER,
            'token' => ResourceInvitation::generateUniqueToken(),
            'invited_by_user_id' => $inviter->id,
            'status' => ResourceInvitationStatus::PENDING,
            'expires_at' => now()->addHour(),
        ]);

        app(ResourceInvitationService::class)->revoke($invitation);

        $this->assertDatabaseHas('resource_invitations', [
            'id' => $invitation->id,
            'status' => ResourceInvitationStatus::REVOKED->value,
        ]);
        $this->assertNotNull($invitation->fresh()->revoked_at);
    }

    public function test_habit_lifecycle_api_behavior_is_preserved(): void
    {
        $owner = User::factory()->create();
        $habit = Habit::query()->create([
            'created_by' => $owner->id,
            'name' => 'Daily care',
            'timezone' => 'UTC',
            'value_type' => 'yes_no',
            'day_summary_mode' => 'average_scored_pets',
            'share_with_coowners' => false,
            'reminder_enabled' => false,
        ]);

        $this->actingAs($owner)
            ->postJson("/api/habits/{$habit->id}/archive")
            ->assertOk()
            ->assertJsonPath('message', __('messages.habits.archived'));
        $this->assertNotNull($habit->fresh()->archived_at);

        $this->actingAs($owner)
            ->postJson("/api/habits/{$habit->id}/restore")
            ->assertOk()
            ->assertJsonPath('message', __('messages.habits.unarchived'));
        $this->assertNull($habit->fresh()->archived_at);

        $this->actingAs($owner)
            ->deleteJson("/api/habits/{$habit->id}")
            ->assertOk()
            ->assertJsonPath('message', __('messages.habits.deleted'));
        $this->assertDatabaseMissing('habits', ['id' => $habit->id]);
    }
}
