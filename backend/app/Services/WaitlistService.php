<?php

namespace App\Services;

use App\Models\Invitation;
use App\Models\User;
use App\Models\WaitlistEntry;
use App\Notifications\WaitlistConfirmation;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class WaitlistService
{
    private InvitationService $invitationService;

    public function __construct(InvitationService $invitationService)
    {
        $this->invitationService = $invitationService;
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
        $results = [];

        DB::transaction(function () use ($emails, $inviter, &$results) {
            foreach ($emails as $email) {
                $results[] = $this->processWaitlistInvitation($email, $inviter);
            }
        });

        return $results;
    }

    /**
     * Process a single waitlist invitation.
     */
    private function processWaitlistInvitation(string $email, User $inviter): array
    {
        try {
            $invitation = $this->inviteFromWaitlist($email, $inviter);
            return $this->buildInvitationResult($email, $invitation);
        } catch (\Exception $e) {
            return $this->buildInvitationError($email, $e);
        }
    }

    /**
     * Build successful invitation result.
     */
    private function buildInvitationResult(string $email, $invitation): array
    {
        $result = [
            'email' => $email,
            'success' => $invitation !== null,
        ];

        if ($invitation) {
            $result['invitation'] = $invitation;
        }

        return $result;
    }

    /**
     * Build invitation error result.
     */
    private function buildInvitationError(string $email, \Exception $e): array
    {
        return [
            'email' => $email,
            'success' => false,
            'error' => $e->getMessage(),
        ];
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
        return [
            'total' => WaitlistEntry::count(),
            'pending' => WaitlistEntry::pending()->count(),
            'invited' => WaitlistEntry::invited()->count(),
            'conversion_rate' => $this->calculateConversionRate(),
        ];
    }

    /**
     * Calculate conversion rate from waitlist to invitation
     */
    private function calculateConversionRate(): float
    {
        $total = WaitlistEntry::count();
        $invited = WaitlistEntry::invited()->count();

        if ($total === 0) {
            return 0.0;
        }

        return round($invited / $total * 100, 2);
    }

    /**
     * Get recent waitlist activity
     */
    public function getRecentActivity(int $days = 7): array
    {
        $startDate = now()->subDays($days);

        return [
            'new_entries' => WaitlistEntry::where('created_at', '>=', $startDate)->count(),
            'invitations_sent' => WaitlistEntry::where('invited_at', '>=', $startDate)->count(),
            'daily_breakdown' => $this->getDailyBreakdown($days),
        ];
    }

    /**
     * Get daily breakdown of waitlist activity
     */
    private function getDailyBreakdown(int $days): array
    {
        $breakdown = [];

        for ($i = 0; $i < $days; $i++) {
            $date = now()->subDays($i)->toDateString();

            $breakdown[] = [
                'date' => $date,
                'new_entries' => WaitlistEntry::whereDate('created_at', $date)->count(),
                'invitations_sent' => WaitlistEntry::whereDate('invited_at', $date)->count(),
            ];
        }

        return array_reverse($breakdown);
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
        $errors = [];

        // Basic email validation
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Invalid email format';
        }

        // Check if already registered
        if ($this->isEmailRegistered($email)) {
            $errors[] = 'Email is already registered';
        }

        // Check if already on waitlist
        if ($this->isEmailOnWaitlist($email)) {
            $errors[] = 'Email is already on waitlist';
        }

        return $errors;
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
