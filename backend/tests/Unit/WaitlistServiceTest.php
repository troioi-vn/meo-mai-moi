<?php

namespace Tests\Unit;

use App\Models\Invitation;
use App\Models\User;
use App\Models\WaitlistEntry;
use App\Notifications\WaitlistConfirmation;
use App\Services\InvitationService;
use App\Services\WaitlistService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;
use Tests\Traits\CreatesUsers;

class WaitlistServiceTest extends TestCase
{
    use RefreshDatabase, CreatesUsers;

    private WaitlistService $service;
    private InvitationService $invitationService;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->invitationService = new InvitationService;
        $this->service = new WaitlistService($this->invitationService);
        $this->user = User::factory()->create();
    }

    public function test_add_to_waitlist_creates_waitlist_entry()
    {
        Notification::fake();
        $email = 'test@example.com';

        $entry = $this->service->addToWaitlist($email);

        $this->assertInstanceOf(WaitlistEntry::class, $entry);
        $this->assertEquals($email, $entry->email);
        $this->assertEquals('pending', $entry->status);
        $this->assertDatabaseHas('waitlist_entries', [
            'email' => $email,
            'status' => 'pending'
        ]);
    }

    public function test_add_to_waitlist_throws_validation_exception_for_invalid_email()
    {
        $this->expectException(ValidationException::class);

        $this->service->addToWaitlist('invalid-email');
    }

    public function test_add_to_waitlist_throws_validation_exception_for_duplicate_email()
    {
        $email = 'test@example.com';
        $this->service->addToWaitlist($email);

        $this->expectException(ValidationException::class);

        $this->service->addToWaitlist($email);
    }

    public function test_add_to_waitlist_throws_validation_exception_for_existing_user_email()
    {
        $user = User::factory()->create(['email' => 'existing@example.com']);

        $this->expectException(ValidationException::class);

        $this->service->addToWaitlist($user->email);
    }

    public function test_is_email_on_waitlist_returns_true_for_existing_email()
    {
        $email = 'test@example.com';
        $this->service->addToWaitlist($email);

        $result = $this->service->isEmailOnWaitlist($email);

        $this->assertTrue($result);
    }

    public function test_is_email_on_waitlist_returns_false_for_non_existing_email()
    {
        $result = $this->service->isEmailOnWaitlist('nonexistent@example.com');

        $this->assertFalse($result);
    }

    public function test_get_pending_entries_returns_only_pending_entries()
    {
        $entry1 = $this->service->addToWaitlist('pending1@example.com');
        $entry2 = $this->service->addToWaitlist('pending2@example.com');
        $entry3 = $this->service->addToWaitlist('invited@example.com');
        
        $entry3->markAsInvited();

        $pendingEntries = $this->service->getPendingEntries();

        $this->assertCount(2, $pendingEntries);
        $this->assertTrue($pendingEntries->contains('id', $entry1->id));
        $this->assertTrue($pendingEntries->contains('id', $entry2->id));
        $this->assertFalse($pendingEntries->contains('id', $entry3->id));
    }

    public function test_invite_from_waitlist_creates_invitation_and_marks_entry()
    {
        $email = 'test@example.com';
        $entry = $this->service->addToWaitlist($email);

        $invitation = $this->service->inviteFromWaitlist($email, $this->user);

        $this->assertInstanceOf(Invitation::class, $invitation);
        $this->assertEquals($this->user->id, $invitation->inviter_user_id);
        
        $entry->refresh();
        $this->assertEquals('invited', $entry->status);
        $this->assertNotNull($entry->invited_at);
    }

    public function test_invite_from_waitlist_returns_null_for_non_existent_email()
    {
        $invitation = $this->service->inviteFromWaitlist('nonexistent@example.com', $this->user);

        $this->assertNull($invitation);
    }

    public function test_invite_from_waitlist_returns_null_for_already_invited_email()
    {
        $email = 'test@example.com';
        $entry = $this->service->addToWaitlist($email);
        $entry->markAsInvited();

        $invitation = $this->service->inviteFromWaitlist($email, $this->user);

        $this->assertNull($invitation);
    }

    public function test_bulk_invite_from_waitlist_processes_multiple_emails()
    {
        $email1 = 'test1@example.com';
        $email2 = 'test2@example.com';
        $email3 = 'nonexistent@example.com';
        
        $this->service->addToWaitlist($email1);
        $this->service->addToWaitlist($email2);

        $results = $this->service->bulkInviteFromWaitlist([$email1, $email2, $email3], $this->user);

        $this->assertCount(3, $results);
        
        // First two should succeed
        $this->assertTrue($results[0]['success']);
        $this->assertEquals($email1, $results[0]['email']);
        $this->assertInstanceOf(Invitation::class, $results[0]['invitation']);
        
        $this->assertTrue($results[1]['success']);
        $this->assertEquals($email2, $results[1]['email']);
        $this->assertInstanceOf(Invitation::class, $results[1]['invitation']);
        
        // Third should fail
        $this->assertFalse($results[2]['success']);
        $this->assertEquals($email3, $results[2]['email']);
        $this->assertArrayNotHasKey('invitation', $results[2]);
    }

    public function test_remove_from_waitlist_deletes_entry()
    {
        $email = 'test@example.com';
        $entry = $this->service->addToWaitlist($email);

        $result = $this->service->removeFromWaitlist($email);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('waitlist_entries', ['id' => $entry->id]);
    }

    public function test_remove_from_waitlist_returns_false_for_non_existent_email()
    {
        $result = $this->service->removeFromWaitlist('nonexistent@example.com');

        $this->assertFalse($result);
    }

    public function test_get_waitlist_stats_returns_correct_counts()
    {
        $entry1 = $this->service->addToWaitlist('pending1@example.com');
        $entry2 = $this->service->addToWaitlist('pending2@example.com');
        $entry3 = $this->service->addToWaitlist('invited@example.com');
        
        $entry3->markAsInvited();

        $stats = $this->service->getWaitlistStats();

        $this->assertEquals([
            'total' => 3,
            'pending' => 2,
            'invited' => 1,
            'conversion_rate' => 33.33, // 1 invited out of 3 total
        ], $stats);
    }

    public function test_get_recent_activity_returns_activity_for_specified_days()
    {
        // Create entries today
        $this->service->addToWaitlist('today1@example.com');
        $this->service->addToWaitlist('today2@example.com');
        
        // Create entry yesterday and mark as invited
        $yesterdayEntry = $this->service->addToWaitlist('yesterday@example.com');
        $yesterdayEntry->update(['created_at' => now()->subDay()]);
        $yesterdayEntry->markAsInvited();
        $yesterdayEntry->update(['invited_at' => now()->subDay()]);

        $activity = $this->service->getRecentActivity(7);

        $this->assertEquals(3, $activity['new_entries']);
        $this->assertEquals(1, $activity['invitations_sent']);
        $this->assertIsArray($activity['daily_breakdown']);
        $this->assertCount(7, $activity['daily_breakdown']);
    }

    public function test_is_email_registered_returns_true_for_existing_user()
    {
        $user = User::factory()->create(['email' => 'existing@example.com']);

        $result = $this->service->isEmailRegistered($user->email);

        $this->assertTrue($result);
    }

    public function test_is_email_registered_returns_false_for_non_existing_user()
    {
        $result = $this->service->isEmailRegistered('nonexistent@example.com');

        $this->assertFalse($result);
    }

    public function test_validate_email_for_waitlist_returns_errors_for_invalid_email()
    {
        $errors = $this->service->validateEmailForWaitlist('invalid-email');

        $this->assertContains('Invalid email format', $errors);
    }

    public function test_validate_email_for_waitlist_returns_errors_for_registered_email()
    {
        $user = User::factory()->create(['email' => 'existing@example.com']);

        $errors = $this->service->validateEmailForWaitlist($user->email);

        $this->assertContains('Email is already registered', $errors);
    }

    public function test_validate_email_for_waitlist_returns_errors_for_waitlisted_email()
    {
        $email = 'waitlisted@example.com';
        $this->service->addToWaitlist($email);

        $errors = $this->service->validateEmailForWaitlist($email);

        $this->assertContains('Email is already on waitlist', $errors);
    }

    public function test_validate_email_for_waitlist_returns_empty_array_for_valid_email()
    {
        $errors = $this->service->validateEmailForWaitlist('valid@example.com');

        $this->assertEmpty($errors);
    }

    public function test_unsubscribe_from_waitlist_removes_entry()
    {
        $email = 'test@example.com';
        $entry = $this->service->addToWaitlist($email);

        $result = $this->service->unsubscribeFromWaitlist($email);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('waitlist_entries', ['id' => $entry->id]);
    }

    public function test_unsubscribe_from_waitlist_returns_false_for_non_existent_email()
    {
        $result = $this->service->unsubscribeFromWaitlist('nonexistent@example.com');

        $this->assertFalse($result);
    }
}