<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Events\InvitationEmailRequested;
use App\Models\Invitation;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class McpPhase4B3WriteTest extends TestCase
{
    use RefreshDatabase;

    public function test_notification_write_is_narrow_expected_state_and_replay_safe(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('MCP notifications write', ['notifications:write'])->plainTextToken;
        $notification = Notification::factory()->create([
            'user_id' => $user->id,
            'type' => NotificationType::SYSTEM_ANNOUNCEMENT->value,
            'data' => ['channel' => 'in_app'],
            'read_at' => null,
        ]);

        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-notification-read')
            ->patchJson("/api/notifications/{$notification->id}/read")
            ->assertNoContent();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-notification-read')
            ->patchJson("/api/notifications/{$notification->id}/read")
            ->assertNoContent();

        Notification::factory()->count(2)->create([
            'user_id' => $user->id,
            'type' => NotificationType::SYSTEM_ANNOUNCEMENT->value,
            'data' => ['channel' => 'in_app'],
            'read_at' => null,
        ]);
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-notification-all-stale')
            ->postJson('/api/notifications/mark-all-read', ['expected_unread_count' => 1])
            ->assertConflict();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-notification-all')
            ->postJson('/api/notifications/mark-all-read', ['expected_unread_count' => 2])
            ->assertNoContent();

        NotificationPreference::query()->create([
            'user_id' => $user->id,
            'notification_type' => NotificationType::SYSTEM_ANNOUNCEMENT->value,
            'email_enabled' => true,
            'in_app_enabled' => true,
            'telegram_enabled' => false,
        ]);
        $payload = ['preferences' => [[
            'type' => NotificationType::SYSTEM_ANNOUNCEMENT->value,
            'expected_email_enabled' => true,
            'expected_in_app_enabled' => true,
            'expected_telegram_enabled' => false,
            'email_enabled' => false,
            'in_app_enabled' => true,
            'telegram_enabled' => false,
        ]]];
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-notification-preference')
            ->putJson('/api/notification-preferences', $payload)
            ->assertOk();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-notification-preference')
            ->putJson('/api/notification-preferences', $payload)
            ->assertOk();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-notification-preference-stale')
            ->putJson('/api/notification-preferences', $payload)
            ->assertConflict();

        $this->withToken($token)->putJson('/api/users/me', [])->assertForbidden();
    }

    public function test_profile_write_is_safe_versioned_and_replay_safe(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $token = $user->createToken('MCP profile write', ['profile:write'])->plainTextToken;
        $version = (string) $user->updated_at?->toISOString();
        $payload = [
            'name' => 'Safer Display Name',
            'email' => $user->email,
            'base_version' => $version,
        ];

        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-profile-stale')
            ->putJson('/api/users/me', [...$payload, 'base_version' => '2000-01-01T00:00:00.000000Z'])
            ->assertConflict();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-profile-name')
            ->putJson('/api/users/me', $payload)
            ->assertOk()
            ->assertJsonPath('data.name', 'Safer Display Name');
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-profile-name')
            ->putJson('/api/users/me', $payload)
            ->assertOk();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-profile-email')
            ->putJson('/api/users/me', [
                'name' => 'Safer Display Name',
                'email' => 'new-identity@example.test',
                'base_version' => (string) $user->fresh()->updated_at?->toISOString(),
            ])->assertUnprocessable()->assertJsonValidationErrors(['email']);
        $this->withToken($token)
            ->putJson('/api/users/me/password', [
                'current_password' => 'irrelevant',
                'new_password' => 'NotAllowed123!',
                'new_password_confirmation' => 'NotAllowed123!',
            ])->assertForbidden();

        $weightPayload = ['weight_kg' => 62.4, 'record_date' => '2026-07-20'];
        $created = $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-owner-weight')
            ->postJson('/api/users/me/owner-weights', $weightPayload)
            ->assertCreated();
        $weightId = (int) $created->json('data.id');
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-owner-weight')
            ->postJson('/api/users/me/owner-weights', $weightPayload)
            ->assertCreated()
            ->assertJsonPath('data.id', $weightId);
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-owner-weight-duplicate')
            ->postJson('/api/users/me/owner-weights', $weightPayload)
            ->assertConflict()
            ->assertJsonPath('data.code', 'duplicate_candidate');
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-owner-weight-stale')
            ->putJson("/api/users/me/owner-weights/{$weightId}", [
                'weight_kg' => 62.8,
                'base_version' => '2000-01-01T00:00:00.000000Z',
            ])->assertConflict();

        $readToken = $user->createToken('MCP profile read', ['profile:read'])->plainTextToken;
        $this->withToken($readToken)
            ->getJson("/api/users/me/owner-weights/{$weightId}")
            ->assertOk()
            ->assertJsonPath('data.id', $weightId);
        $this->withToken($readToken)
            ->withHeader('Idempotency-Key', 'phase-four-owner-weight-read-denied')
            ->deleteJson("/api/users/me/owner-weights/{$weightId}")
            ->assertForbidden();

        $avatarVersion = (string) $user->fresh()->updated_at?->toISOString();
        $avatar = $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-profile-avatar')
            ->post('/api/users/me/avatar', [
                'avatar' => UploadedFile::fake()->createWithContent(
                    'avatar.png',
                    (string) base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
                ),
                'base_version' => $avatarVersion,
            ], ['Accept' => 'application/json'])
            ->assertOk();
        $avatarUrl = (string) $avatar->json('data.avatar_url');
        $this->assertNotSame('', $avatarUrl);
        $avatarDeleteVersion = (string) $user->fresh()->updated_at?->toISOString();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-profile-avatar-delete-stale')
            ->deleteJson('/api/users/me/avatar', [
                'expected_avatar_url' => $avatarUrl,
                'base_version' => '2000-01-01T00:00:00.000000Z',
            ])->assertConflict();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-profile-avatar-delete')
            ->deleteJson('/api/users/me/avatar', [
                'expected_avatar_url' => $avatarUrl,
                'base_version' => $avatarDeleteVersion,
            ])->assertNoContent();
    }

    public function test_account_invitation_write_is_narrow_versioned_and_replay_safe(): void
    {
        Event::fake([InvitationEmailRequested::class]);
        $user = User::factory()->create();
        $token = $user->createToken('MCP invitations write', ['invitations:write'])->plainTextToken;

        $generic = $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-account-invitation-generic')
            ->postJson('/api/invitations')
            ->assertCreated();
        $genericId = (int) $generic->json('data.id');
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-account-invitation-generic')
            ->postJson('/api/invitations')
            ->assertCreated()
            ->assertJsonPath('data.id', $genericId);

        $emailPayload = ['email' => 'invitee@example.test'];
        $targeted = $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-account-invitation-email')
            ->postJson('/api/invitations', $emailPayload)
            ->assertCreated();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-account-invitation-email-duplicate')
            ->postJson('/api/invitations', $emailPayload)
            ->assertConflict()
            ->assertJsonPath('data.code', 'duplicate_candidate');

        $targetId = (int) $targeted->json('data.id');
        $version = (string) Invitation::query()->findOrFail($targetId)->updated_at?->toISOString();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-account-invitation-revoke-stale')
            ->deleteJson("/api/invitations/{$targetId}", [
                'base_version' => '2000-01-01T00:00:00.000000Z',
            ])->assertConflict();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-account-invitation-revoke-wrong-target')
            ->deleteJson("/api/invitations/{$targetId}", [
                'base_version' => $version,
                'expected_target_email' => 'someone-else@example.test',
            ])->assertConflict();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-account-invitation-revoke')
            ->deleteJson("/api/invitations/{$targetId}", [
                'base_version' => $version,
                'expected_target_email' => 'invitee@example.test',
            ])
            ->assertOk();
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-account-invitation-revoke')
            ->deleteJson("/api/invitations/{$targetId}", [
                'base_version' => $version,
                'expected_target_email' => 'invitee@example.test',
            ])
            ->assertOk();

        $this->assertDatabaseHas('invitations', [
            'id' => $targetId,
            'status' => 'revoked',
        ]);
        $this->withToken($token)
            ->withHeader('Idempotency-Key', 'phase-four-invitations-cross-domain')
            ->postJson('/api/notifications/mark-all-read', ['expected_unread_count' => 0])
            ->assertForbidden();
    }
}
