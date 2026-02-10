<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\InvitationStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Invitation extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'inviter_user_id',
        'recipient_user_id',
        'email',
        'status',
        'expires_at',
    ];

    protected $casts = [
        'status' => InvitationStatus::class,
        'expires_at' => 'datetime',
    ];

    /**
     * Relationship to the user who sent the invitation
     */
    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inviter_user_id');
    }

    /**
     * Relationship to the user who received/accepted the invitation
     */
    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }

    /**
     * Check if the invitation is valid (not expired, not used, pending status)
     */
    public function isValid(): bool
    {
        if ($this->status !== InvitationStatus::PENDING) {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            $this->update(['status' => InvitationStatus::EXPIRED]);

            return false;
        }

        return true;
    }

    /**
     * Mark invitation as accepted by a user
     */
    public function markAsAccepted(User $user): void
    {
        $this->update([
            'status' => InvitationStatus::ACCEPTED,
            'recipient_user_id' => $user->id,
        ]);
    }

    /**
     * Mark invitation as revoked
     */
    public function markAsRevoked(): void
    {
        $this->update(['status' => InvitationStatus::REVOKED]);
    }

    /**
     * Generate a unique invitation code
     */
    public static function generateUniqueCode(): string
    {
        do {
            $code = Str::random(32);
        } while (static::where('code', $code)->exists());

        return $code;
    }

    /**
     * Scope for pending invitations
     */
    public function scopePending($query)
    {
        return $query->where('status', InvitationStatus::PENDING);
    }

    /**
     * Scope for accepted invitations
     */
    public function scopeAccepted($query)
    {
        return $query->where('status', 'accepted');
    }

    /**
     * Scope for expired invitations
     */
    public function scopeExpired($query)
    {
        return $query->where('status', 'expired')
            ->orWhere(function ($query): void {
                $query->where('expires_at', '<', now())
                    ->where('status', 'pending');
            });
    }

    /**
     * Get invitation URL
     */
    public function getInvitationUrl(): string
    {
        return url("/register?invitation_code={$this->code}");
    }
}
