<?php

namespace Tests\Unit\Models;

use App\Models\WaitlistEntry;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WaitlistEntryTest extends TestCase
{
    use RefreshDatabase;

    public function test_mark_as_invited_updates_status_and_invited_at()
    {
        $entry = WaitlistEntry::factory()->create([
            'status' => 'pending',
            'invited_at' => null,
        ]);

        $entry->markAsInvited();

        $entry->refresh();
        $this->assertEquals('invited', $entry->status);
        $this->assertNotNull($entry->invited_at);
        $this->assertInstanceOf(Carbon::class, $entry->invited_at);
    }

    public function test_pending_scope_returns_only_pending_entries()
    {
        $pendingEntry = WaitlistEntry::factory()->create(['status' => 'pending']);
        $invitedEntry = WaitlistEntry::factory()->create(['status' => 'invited']);

        $pendingEntries = WaitlistEntry::pending()->get();

        $this->assertCount(1, $pendingEntries);
        $this->assertEquals($pendingEntry->id, $pendingEntries->first()->id);
    }

    public function test_invited_scope_returns_only_invited_entries()
    {
        $pendingEntry = WaitlistEntry::factory()->create(['status' => 'pending']);
        $invitedEntry = WaitlistEntry::factory()->create(['status' => 'invited']);

        $invitedEntries = WaitlistEntry::invited()->get();

        $this->assertCount(1, $invitedEntries);
        $this->assertEquals($invitedEntry->id, $invitedEntries->first()->id);
    }

    public function test_is_email_on_waitlist_returns_true_for_existing_email()
    {
        $email = 'test@example.com';
        WaitlistEntry::factory()->create(['email' => $email]);

        $result = WaitlistEntry::isEmailOnWaitlist($email);

        $this->assertTrue($result);
    }

    public function test_is_email_on_waitlist_returns_false_for_non_existing_email()
    {
        $result = WaitlistEntry::isEmailOnWaitlist('nonexistent@example.com');

        $this->assertFalse($result);
    }

    public function test_get_pending_entries_returns_pending_entries_ordered_by_creation()
    {
        // Create entries with different creation times
        $entry1 = WaitlistEntry::factory()->create([
            'email' => 'first@example.com',
            'status' => 'pending',
            'created_at' => Carbon::now()->subDays(2),
        ]);

        $entry2 = WaitlistEntry::factory()->create([
            'email' => 'second@example.com',
            'status' => 'pending',
            'created_at' => Carbon::now()->subDay(),
        ]);

        $entry3 = WaitlistEntry::factory()->create([
            'email' => 'invited@example.com',
            'status' => 'invited',
            'created_at' => Carbon::now(),
        ]);

        $pendingEntries = WaitlistEntry::getPendingEntries();

        $this->assertCount(2, $pendingEntries);
        // Should be ordered by creation date (oldest first)
        $this->assertEquals($entry1->id, $pendingEntries->first()->id);
        $this->assertEquals($entry2->id, $pendingEntries->last()->id);
    }

    public function test_validation_rules_include_required_email()
    {
        $rules = WaitlistEntry::validationRules();

        $this->assertContains('required', $rules['email']);
        $this->assertContains('email', $rules['email']);
    }

    public function test_validation_rules_include_unique_constraints()
    {
        $rules = WaitlistEntry::validationRules();

        $this->assertContains('unique:waitlist_entries,email', $rules['email']);
        $this->assertContains('unique:users,email', $rules['email']);
    }

    public function test_validation_rules_include_max_length()
    {
        $rules = WaitlistEntry::validationRules();

        $this->assertContains('max:255', $rules['email']);
    }

    public function test_invited_at_is_cast_to_datetime()
    {
        $invitedAt = Carbon::now();
        $entry = WaitlistEntry::factory()->create([
            'invited_at' => $invitedAt,
        ]);

        $this->assertInstanceOf(Carbon::class, $entry->invited_at);
        $this->assertEquals($invitedAt->toDateTimeString(), $entry->invited_at->toDateTimeString());
    }

    public function test_invited_at_can_be_null()
    {
        $entry = WaitlistEntry::factory()->create([
            'invited_at' => null,
        ]);

        $this->assertNull($entry->invited_at);
    }

    public function test_fillable_attributes_are_correct()
    {
        $entry = new WaitlistEntry;
        $fillable = $entry->getFillable();

        $this->assertContains('email', $fillable);
        $this->assertContains('status', $fillable);
        $this->assertContains('invited_at', $fillable);
    }

    public function test_can_create_entry_with_fillable_attributes()
    {
        $data = [
            'email' => 'test@example.com',
            'status' => 'pending',
            'invited_at' => null,
        ];

        $entry = WaitlistEntry::create($data);

        $this->assertEquals($data['email'], $entry->email);
        $this->assertEquals($data['status'], $entry->status);
        $this->assertEquals($data['invited_at'], $entry->invited_at);
    }
}
