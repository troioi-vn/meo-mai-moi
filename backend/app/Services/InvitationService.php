<?php

namespace App\Services;

use App\Models\Invitation;
use App\Models\User;
use App\Notifications\InvitationToEmail;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class InvitationService
{
    /**
     * Generate a new invitation for a user
     */
    public function generateInvitation(User $inviter, ?Carbon $expiresAt = null): Invitation
    {
        return DB::transaction(function () use ($inviter, $expiresAt) {
            $invitation = new Invitation([
                'code' => Invitation::generateUniqueCode(),
                'inviter_user_id' => $inviter->id,
                'status' => 'pending',
                'expires_at' => $expiresAt,
            ]);

            $invitation->save();

            return $invitation;
        });
    }

    /**
     * Generate and send invitation to a specific email address
     */
    public function generateAndSendInvitation(User $inviter, string $email, ?Carbon $expiresAt = null): Invitation
    {
        return DB::transaction(function () use ($inviter, $email, $expiresAt) {
            $invitation = $this->generateInvitation($inviter, $expiresAt);

            // Send email notification
            try {
                InvitationToEmail::sendToEmail($email, $invitation, $inviter);
            } catch (\Exception $e) {
                // Log the error but don't fail the invitation creation
                \Log::warning('Failed to send invitation email', [
                    'invitation_id' => $invitation->id,
                    'email' => $email,
                    'error' => $e->getMessage(),
                ]);
            }

            return $invitation;
        });
    }

    /**
     * Validate an invitation code and return the invitation if valid
     */
    public function validateInvitationCode(string $code): ?Invitation
    {
        $invitation = Invitation::where('code', $code)->first();

        if (! $invitation) {
            return null;
        }

        if (! $invitation->isValid()) {
            return null;
        }

        return $invitation;
    }

    /**
     * Accept an invitation with a user
     */
    public function acceptInvitation(string $code, User $user): bool
    {
        return DB::transaction(function () use ($code, $user) {
            $invitation = $this->validateInvitationCode($code);

            if (! $invitation) {
                return false;
            }

            $invitation->markAsAccepted($user);

            return true;
        });
    }

    /**
     * Get all invitations sent by a user
     */
    public function getUserInvitations(User $user): Collection
    {
        return $user->sentInvitations()
            ->with('recipient')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Revoke an invitation
     */
    public function revokeInvitation(int $invitationId, User $user): bool
    {
        $invitation = Invitation::where('id', $invitationId)
            ->where('inviter_user_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if (! $invitation) {
            return false;
        }

        $invitation->markAsRevoked();

        return true;
    }

    /**
     * Clean up expired invitations
     */
    public function cleanupExpiredInvitations(): int
    {
        return Invitation::where('expires_at', '<', now())
            ->where('status', 'pending')
            ->update(['status' => 'expired']);
    }

    /**
     * Get invitation statistics for a user
     */
    public function getUserInvitationStats(User $user): array
    {
        $invitations = $user->sentInvitations();

        return [
            'total' => $invitations->count(),
            'pending' => (clone $invitations)->where('status', 'pending')->count(),
            'accepted' => (clone $invitations)->where('status', 'accepted')->count(),
            'expired' => (clone $invitations)->where('status', 'expired')->count(),
            'revoked' => (clone $invitations)->where('status', 'revoked')->count(),
        ];
    }

    /**
     * Check if a user can generate more invitations (rate limiting)
     */
    public function canUserGenerateInvitation(User $user, int $maxPerDay = 10): bool
    {
        $todayCount = $user->sentInvitations()
            ->whereDate('created_at', today())
            ->count();

        return $todayCount < $maxPerDay;
    }

    /**
     * Get system-wide invitation statistics
     */
    public function getSystemInvitationStats(): array
    {
        return [
            'total' => Invitation::count(),
            'pending' => Invitation::where('status', 'pending')->count(),
            'accepted' => Invitation::where('status', 'accepted')->count(),
            'expired' => Invitation::where('status', 'expired')->count(),
            'revoked' => Invitation::where('status', 'revoked')->count(),
            'acceptance_rate' => $this->calculateAcceptanceRate(),
        ];
    }

    /**
     * Calculate invitation acceptance rate
     */
    private function calculateAcceptanceRate(): float
    {
        $total = Invitation::whereIn('status', ['accepted', 'expired', 'revoked'])->count();
        $accepted = Invitation::where('status', 'accepted')->count();

        if ($total === 0) {
            return 0.0;
        }

        return round($accepted / $total * 100, 2);
    }
}
