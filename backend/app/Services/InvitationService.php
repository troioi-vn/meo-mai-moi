<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\InvitationStatus;
use App\Events\InvitationEmailRequested;
use App\Models\Invitation;
use App\Models\User;
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
    public function generateAndSendInvitation(User $inviter, string $email, ?Carbon $expiresAt = null, ?string $locale = null): Invitation
    {
        return DB::transaction(function () use ($inviter, $email, $expiresAt, $locale) {
            $invitation = $this->generateInvitation($inviter, $expiresAt);

            // Store the recipient email on the invitation
            $invitation->update(['email' => $email]);

            DB::afterCommit(function () use ($invitation, $inviter, $email, $locale): void {
                event(new InvitationEmailRequested(
                    $invitation,
                    $inviter,
                    $email,
                    $locale,
                ));
            });

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

            // Clean up waitlist entry for the invited email (handles Google Sign-In with different email too)
            if ($invitation->email) {
                app(WaitlistService::class)->removeFromWaitlist($invitation->email);
            }

            return true;
        });
    }

    /**
     * Get all invitations sent by a user
     *
     * @return Collection<int, Invitation>
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
     *
     * @return array{total: int, pending: int, accepted: int, expired: int, revoked: int}
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
            ->where('status', '!=', InvitationStatus::REVOKED)
            ->count();

        return $todayCount < $maxPerDay;
    }

    /**
     * Get system-wide invitation statistics
     *
     * @return array{total: int, pending: int, accepted: int, expired: int, revoked: int, acceptance_rate: float}
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
