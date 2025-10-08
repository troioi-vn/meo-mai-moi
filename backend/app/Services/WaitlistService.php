<?php

namespace App\Services;

use App\Models\Invitation;
use App\Models\User;
use App\Models\WaitlistEntry;
use App\Notifications\WaitlistConfirmation;
use App\Services\Waitlist\BulkInvitationProcessor;
use App\Services\Waitlist\WaitlistStatsCalculator;
use App\Services\Waitlist\WaitlistValidator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class WaitlistService
{
    private InvitationService $invitationService;
    private WaitlistValidator $validator;
    private WaitlistStatsCalculator $statsCalculator;
    private BulkInvitationProcessor $bulkProcessor;

    public function __construct(
        InvitationService $invitationService,
        ?WaitlistValidator $validator = null,
        ?WaitlistStatsCalculator $statsCalculator = null,
        ?BulkInvitationProcessor $bulkProcessor = null
    ) {
        $this->invitationService = $invitationService;
        $this->validator = $validator ?? new WaitlistValidator();
        $this->statsCalculator = $statsCalculator ?? new WaitlistStatsCalculator();
        $this->bulkProcessor = $bulkProcessor ?? new BulkInvitationProcessor($invitationService);
    }

    /**
     * Add an email to the waitlist
     */
    public function addToWaitlist(string $email): WaitlistEntry
    {
        // Validate email
        $validator = Validator::make(['email' => $email], WaitlistEntry::validationRules());

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return DB::transaction(function () use ($email) {
            $waitlistEntry = WaitlistEntry::create([
                'email' => $email,
                'status' => 'pending',
            ]);

            // Send confirmation email
            try {
                WaitlistConfirmation::sendToEmail($email, $waitlistEntry);
            } catch (\Exception $e) {
                // Log the error but don't fail the waitlist entry creation
                \Log::warning('Failed to send waitlist confirmation email', [
                    'waitlist_entry_id' => $waitlistEntry->id,
                    'email' => $email,
                    'error' => $e->getMessage(),
                ]);
            }

            return $waitlistEntry;
        });
    }

    /**
     * Check if an email is already on the waitlist
     */
    public function isEmailOnWaitlist(string $email): bool
    {
        return WaitlistEntry::isEmailOnWaitlist($email);
    }

    /**
     * Get all pending waitlist entries
     */
    public function getPendingEntries(): Collection
    {
        return WaitlistEntry::getPendingEntries();
    }

    /**
     * Get all waitlist entries with pagination support
     */
    public function getAllEntries(int $perPage = 50)
    {
        return WaitlistEntry::orderBy('created_at', 'desc')->paginate($perPage);
    }

    /**
     * Invite a user from the waitlist
     */
    public function inviteFromWaitlist(string $email, User $inviter): ?Invitation
    {
        return DB::transaction(function () use ($email, $inviter) {
            $waitlistEntry = WaitlistEntry::where('email', $email)
                ->where('status', 'pending')
                ->first();

            if (!$waitlistEntry) {
                return null;
            }

            // Generate and send invitation
            $invitation = $this->invitationService->generateAndSendInvitation($inviter, $email);

            // Mark waitlist entry as invited
            $waitlistEntry->markAsInvited();

            return $invitation;
        });
    }

    /**
     * Bulk invite multiple emails from waitlist
     */
    public function bulkInviteFromWaitlist(array $emails, User $inviter): array
    {
        return $this->bulkProcessor->processBulkInvitations(
            $emails,
            $inviter,
            fn($email, $inviter) => $this->inviteFromWaitlist($email, $inviter)
        );
    }

    /**
     * Remove an email from the waitlist
     */
    public function removeFromWaitlist(string $email): bool
    {
        $entry = WaitlistEntry::where('email', $email)->first();

        if (! $entry) {
            return false;
        }

        $entry->delete();

        return true;
    }

    /**
     * Get waitlist statistics
     */
    public function getWaitlistStats(): array
    {
        return $this->statsCalculator->getWaitlistStats();
    }

    /**
     * Get recent waitlist activity
     */
    public function getRecentActivity(int $days = 7): array
    {
        return $this->statsCalculator->getRecentActivity($days);
    }

    /**
     * Check if user email is already registered
     */
    public function isEmailRegistered(string $email): bool
    {
        return User::where('email', $email)->exists();
    }

    /**
     * Validate email for waitlist (comprehensive check)
     */
    public function validateEmailForWaitlist(string $email): array
    {
        return $this->validator->validateEmailForWaitlist($email);
    }

    /**
     * Unsubscribe email from waitlist
     */
    public function unsubscribeFromWaitlist(string $email): bool
    {
        $waitlistEntry = WaitlistEntry::where('email', $email)->first();

        if (! $waitlistEntry) {
            return false;
        }

        $waitlistEntry->delete();
        return true;
    }
}
