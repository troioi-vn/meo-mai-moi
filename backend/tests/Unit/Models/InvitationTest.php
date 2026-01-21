<?php

namespace Tests\Unit\Models;

use App\Enums\InvitationStatus;
use App\Models\Invitation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvitationTest extends TestCase
{
    use RefreshDatabase;

    private User $inviter;

    private User $recipient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->inviter = User::factory()->create();
        $this->recipient = User::factory()->create();
    }

    public function test_invitation_belongs_to_inviter()
    {
        $invitation = Invitation::factory()->create([
            'inviter_user_id' => $this->inviter->id,
        ]);

        $this->assertEquals($this->inviter->id, $invitation->inviter->id);
    }

    public function test_invitation_belongs_to_recipient()
    {
        $invitation = Invitation::factory()->create([
            'recipient_user_id' => $this->recipient->id,
        ]);

        $this->assertEquals($this->recipient->id, $invitation->recipient->id);
    }

    public function test_is_valid_returns_true_for_pending_non_expired_invitation()
    {
        $invitation = Invitation::factory()->create([
            'status' => 'pending',
            'expires_at' => Carbon::now()->addDay(),
        ]);

        $this->assertTrue($invitation->isValid());
    }

    public function test_is_valid_returns_false_for_accepted_invitation()
    {
        $invitation = Invitation::factory()->create([
            'status' => 'accepted',
        ]);

        $this->assertFalse($invitation->isValid());
    }

    public function test_is_valid_returns_false_for_revoked_invitation()
    {
        $invitation = Invitation::factory()->create([
            'status' => 'revoked',
        ]);

        $this->assertFalse($invitation->isValid());
    }

    public function test_is_valid_returns_false_for_expired_invitation()
    {
        $invitation = Invitation::factory()->create([
            'status' => 'pending',
            'expires_at' => Carbon::now()->subDay(),
        ]);

        $this->assertFalse($invitation->isValid());
    }

    public function test_is_valid_marks_expired_invitation_as_expired()
    {
        $invitation = Invitation::factory()->create([
            'status' => 'pending',
            'expires_at' => Carbon::now()->subDay(),
        ]);

        $invitation->isValid();

        $invitation->refresh();
        $this->assertEquals(InvitationStatus::EXPIRED, $invitation->status);
    }

    public function test_is_valid_returns_true_for_invitation_without_expiry()
    {
        $invitation = Invitation::factory()->create([
            'status' => 'pending',
            'expires_at' => null,
        ]);

        $this->assertTrue($invitation->isValid());
    }

    public function test_mark_as_accepted_updates_status_and_recipient()
    {
        $invitation = Invitation::factory()->create([
            'status' => 'pending',
        ]);

        $invitation->markAsAccepted($this->recipient);

        $invitation->refresh();
        $this->assertEquals(InvitationStatus::ACCEPTED, $invitation->status);
        $this->assertEquals($this->recipient->id, $invitation->recipient_user_id);
    }

    public function test_mark_as_revoked_updates_status()
    {
        $invitation = Invitation::factory()->create([
            'status' => 'pending',
        ]);

        $invitation->markAsRevoked();

        $invitation->refresh();
        $this->assertEquals(InvitationStatus::REVOKED, $invitation->status);
    }

    public function test_generate_unique_code_creates_32_character_string()
    {
        $code = Invitation::generateUniqueCode();

        $this->assertEquals(32, strlen($code));
        $this->assertMatchesRegularExpression('/^[a-zA-Z0-9]+$/', $code);
    }

    public function test_generate_unique_code_creates_unique_codes()
    {
        $code1 = Invitation::generateUniqueCode();
        $code2 = Invitation::generateUniqueCode();

        $this->assertNotEquals($code1, $code2);
    }

    public function test_generate_unique_code_avoids_duplicates()
    {
        // Create an invitation with a specific code
        $existingCode = 'existing_code_12345678901234567890';
        Invitation::factory()->create(['code' => $existingCode]);

        // Mock Str::random to return the existing code first, then a new one
        $this->mock(\Illuminate\Support\Str::class, function ($mock) use ($existingCode) {
            $mock->shouldReceive('random')
                ->with(32)
                ->andReturn($existingCode, 'new_unique_code_1234567890123456');
        });

        $newCode = Invitation::generateUniqueCode();

        $this->assertNotEquals($existingCode, $newCode);
    }

    public function test_pending_scope_returns_only_pending_invitations()
    {
        $pendingInvitation = Invitation::factory()->create(['status' => 'pending']);
        $acceptedInvitation = Invitation::factory()->create(['status' => 'accepted']);
        $revokedInvitation = Invitation::factory()->create(['status' => 'revoked']);

        $pendingInvitations = Invitation::pending()->get();

        $this->assertCount(1, $pendingInvitations);
        $this->assertEquals($pendingInvitation->id, $pendingInvitations->first()->id);
    }

    public function test_accepted_scope_returns_only_accepted_invitations()
    {
        $pendingInvitation = Invitation::factory()->create(['status' => 'pending']);
        $acceptedInvitation = Invitation::factory()->create(['status' => 'accepted']);
        $revokedInvitation = Invitation::factory()->create(['status' => 'revoked']);

        $acceptedInvitations = Invitation::accepted()->get();

        $this->assertCount(1, $acceptedInvitations);
        $this->assertEquals($acceptedInvitation->id, $acceptedInvitations->first()->id);
    }

    public function test_expired_scope_returns_expired_invitations()
    {
        $expiredByStatus = Invitation::factory()->create(['status' => 'expired']);
        $expiredByDate = Invitation::factory()->create([
            'status' => 'pending',
            'expires_at' => Carbon::now()->subDay(),
        ]);
        $validInvitation = Invitation::factory()->create([
            'status' => 'pending',
            'expires_at' => Carbon::now()->addDay(),
        ]);

        $expiredInvitations = Invitation::expired()->get();

        $this->assertCount(2, $expiredInvitations);
        $this->assertTrue($expiredInvitations->contains('id', $expiredByStatus->id));
        $this->assertTrue($expiredInvitations->contains('id', $expiredByDate->id));
        $this->assertFalse($expiredInvitations->contains('id', $validInvitation->id));
    }

    public function test_get_invitation_url_returns_correct_url()
    {
        $invitation = Invitation::factory()->create(['code' => 'test_code_123']);

        $url = $invitation->getInvitationUrl();

        $this->assertEquals(url('/register?invitation_code=test_code_123'), $url);
    }

    public function test_expires_at_is_cast_to_datetime()
    {
        $expiryDate = Carbon::now()->addDays(7);
        $invitation = Invitation::factory()->create([
            'expires_at' => $expiryDate,
        ]);

        $this->assertInstanceOf(Carbon::class, $invitation->expires_at);
        $this->assertEquals($expiryDate->toDateTimeString(), $invitation->expires_at->toDateTimeString());
    }
}
