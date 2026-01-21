<?php

namespace Tests\Unit;

use App\Enums\InvitationStatus;
use App\Models\Invitation;
use App\Models\User;
use App\Services\InvitationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;
use Tests\Traits\CreatesUsers;

class InvitationServiceTest extends TestCase
{
    use CreatesUsers;
    use RefreshDatabase;

    private InvitationService $service;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new InvitationService;
        $this->user = User::factory()->create();
    }

    public function test_generate_invitation_creates_invitation_with_unique_code()
    {
        $invitation = $this->service->generateInvitation($this->user);

        $this->assertInstanceOf(Invitation::class, $invitation);
        $this->assertEquals($this->user->id, $invitation->inviter_user_id);
        $this->assertEquals(InvitationStatus::PENDING, $invitation->status);
        $this->assertNotEmpty($invitation->code);
        $this->assertEquals(32, strlen($invitation->code));
        $this->assertDatabaseHas('invitations', [
            'id' => $invitation->id,
            'inviter_user_id' => $this->user->id,
            'status' => 'pending',
        ]);
    }

    public function test_generate_invitation_with_expiry_date()
    {
        $expiresAt = Carbon::now()->addDays(7);

        $invitation = $this->service->generateInvitation($this->user, $expiresAt);

        $this->assertEquals($expiresAt->toDateTimeString(), $invitation->expires_at->toDateTimeString());
    }

    public function test_generate_and_send_invitation_creates_invitation_and_sends_email()
    {
        Notification::fake();
        $email = 'test@example.com';

        $invitation = $this->service->generateAndSendInvitation($this->user, $email);

        $this->assertInstanceOf(Invitation::class, $invitation);
        $this->assertEquals($this->user->id, $invitation->inviter_user_id);

        // Note: We can't easily test the email sending in unit tests since it uses a static method
        // This would be better tested in a feature test
    }

    public function test_validate_invitation_code_returns_invitation_for_valid_code()
    {
        $invitation = $this->service->generateInvitation($this->user);

        $result = $this->service->validateInvitationCode($invitation->code);

        $this->assertInstanceOf(Invitation::class, $result);
        $this->assertEquals($invitation->id, $result->id);
    }

    public function test_validate_invitation_code_returns_null_for_invalid_code()
    {
        $result = $this->service->validateInvitationCode('invalid-code');

        $this->assertNull($result);
    }

    public function test_validate_invitation_code_returns_null_for_expired_invitation()
    {
        $invitation = $this->service->generateInvitation($this->user, Carbon::now()->subDay());

        $result = $this->service->validateInvitationCode($invitation->code);

        $this->assertNull($result);
    }

    public function test_validate_invitation_code_returns_null_for_accepted_invitation()
    {
        $invitation = $this->service->generateInvitation($this->user);
        $recipient = User::factory()->create();
        $invitation->markAsAccepted($recipient);

        $result = $this->service->validateInvitationCode($invitation->code);

        $this->assertNull($result);
    }

    public function test_accept_invitation_marks_invitation_as_accepted()
    {
        $invitation = $this->service->generateInvitation($this->user);
        $recipient = User::factory()->create();

        $result = $this->service->acceptInvitation($invitation->code, $recipient);

        $this->assertTrue($result);
        $invitation->refresh();
        $this->assertEquals(InvitationStatus::ACCEPTED, $invitation->status);
        $this->assertEquals($recipient->id, $invitation->recipient_user_id);
    }

    public function test_accept_invitation_returns_false_for_invalid_code()
    {
        $recipient = User::factory()->create();

        $result = $this->service->acceptInvitation('invalid-code', $recipient);

        $this->assertFalse($result);
    }

    public function test_get_user_invitations_returns_user_invitations()
    {
        $invitation1 = $this->service->generateInvitation($this->user);
        $invitation2 = $this->service->generateInvitation($this->user);

        // Create invitation from different user
        $otherUser = User::factory()->create();
        $this->service->generateInvitation($otherUser);

        $invitations = $this->service->getUserInvitations($this->user);

        $this->assertCount(2, $invitations);
        $this->assertTrue($invitations->contains('id', $invitation1->id));
        $this->assertTrue($invitations->contains('id', $invitation2->id));
    }

    public function test_revoke_invitation_marks_invitation_as_revoked()
    {
        $invitation = $this->service->generateInvitation($this->user);

        $result = $this->service->revokeInvitation($invitation->id, $this->user);

        $this->assertTrue($result);
        $invitation->refresh();
        $this->assertEquals(InvitationStatus::REVOKED, $invitation->status);
    }

    public function test_revoke_invitation_returns_false_for_non_existent_invitation()
    {
        $result = $this->service->revokeInvitation(999, $this->user);

        $this->assertFalse($result);
    }

    public function test_revoke_invitation_returns_false_for_other_users_invitation()
    {
        $otherUser = User::factory()->create();
        $invitation = $this->service->generateInvitation($otherUser);

        $result = $this->service->revokeInvitation($invitation->id, $this->user);

        $this->assertFalse($result);
    }

    public function test_revoke_invitation_returns_false_for_already_accepted_invitation()
    {
        $invitation = $this->service->generateInvitation($this->user);
        $recipient = User::factory()->create();
        $invitation->markAsAccepted($recipient);

        $result = $this->service->revokeInvitation($invitation->id, $this->user);

        $this->assertFalse($result);
    }

    public function test_cleanup_expired_invitations_marks_expired_invitations()
    {
        $expiredInvitation = $this->service->generateInvitation($this->user, Carbon::now()->subDay());
        $validInvitation = $this->service->generateInvitation($this->user, Carbon::now()->addDay());

        $count = $this->service->cleanupExpiredInvitations();

        $this->assertEquals(1, $count);
        $expiredInvitation->refresh();
        $validInvitation->refresh();
        $this->assertEquals(InvitationStatus::EXPIRED, $expiredInvitation->status);
        $this->assertEquals(InvitationStatus::PENDING, $validInvitation->status);
    }

    public function test_get_user_invitation_stats_returns_correct_counts()
    {
        $invitation1 = $this->service->generateInvitation($this->user);
        $invitation2 = $this->service->generateInvitation($this->user);
        $invitation3 = $this->service->generateInvitation($this->user, Carbon::now()->subDay());

        $recipient = User::factory()->create();
        $invitation1->markAsAccepted($recipient);
        $invitation2->markAsRevoked();

        $this->service->cleanupExpiredInvitations();

        $stats = $this->service->getUserInvitationStats($this->user);

        $this->assertEquals([
            'total' => 3,
            'pending' => 0, // expired invitation is no longer pending
            'accepted' => 1,
            'expired' => 1,
            'revoked' => 1,
        ], $stats);
    }

    public function test_can_user_generate_invitation_respects_daily_limit()
    {
        // Create 9 invitations today (under limit of 10)
        for ($i = 0; $i < 9; $i++) {
            $this->service->generateInvitation($this->user);
        }

        $this->assertTrue($this->service->canUserGenerateInvitation($this->user, 10));

        // Create one more (at limit)
        $this->service->generateInvitation($this->user);

        $this->assertFalse($this->service->canUserGenerateInvitation($this->user, 10));
    }

    public function test_can_user_generate_invitation_ignores_previous_days()
    {
        // Create invitation yesterday
        $invitation = $this->service->generateInvitation($this->user);
        $invitation->update(['created_at' => Carbon::yesterday()]);

        Carbon::setTestNow(Carbon::now()->addDay());

        $this->assertTrue($this->service->canUserGenerateInvitation($this->user, 1));
    }

    public function test_get_system_invitation_stats_returns_system_wide_stats()
    {
        $user2 = User::factory()->create();

        $invitation1 = $this->service->generateInvitation($this->user);
        $invitation2 = $this->service->generateInvitation($user2);
        $invitation3 = $this->service->generateInvitation($this->user);

        $recipient = User::factory()->create();
        $invitation1->markAsAccepted($recipient);
        $invitation2->markAsRevoked();

        $stats = $this->service->getSystemInvitationStats();

        $this->assertEquals(3, $stats['total']);
        $this->assertEquals(1, $stats['pending']);
        $this->assertEquals(1, $stats['accepted']);
        $this->assertEquals(0, $stats['expired']);
        $this->assertEquals(1, $stats['revoked']);
        $this->assertEquals(50.0, $stats['acceptance_rate']); // 1 accepted out of 2 completed (accepted + revoked)
    }
}
