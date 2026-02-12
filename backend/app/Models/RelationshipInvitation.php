<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PetRelationshipType;
use App\Enums\RelationshipInvitationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class RelationshipInvitation extends Model
{
    protected $fillable = [
        'pet_id',
        'invited_by_user_id',
        'token',
        'relationship_type',
        'status',
        'expires_at',
        'accepted_at',
        'declined_at',
        'revoked_at',
        'accepted_by_user_id',
    ];

    protected $casts = [
        'relationship_type' => PetRelationshipType::class,
        'status' => RelationshipInvitationStatus::class,
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'declined_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    public function acceptedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by_user_id');
    }

    /**
     * Check if the invitation is still valid (pending and not expired).
     * Auto-expires if past the expiration time.
     */
    public function isValid(): bool
    {
        if ($this->status !== RelationshipInvitationStatus::PENDING) {
            return false;
        }

        if ($this->expires_at->isPast()) {
            $this->update([
                'status' => RelationshipInvitationStatus::EXPIRED,
            ]);

            return false;
        }

        return true;
    }

    /**
     * Generate a unique URL-safe token.
     */
    public static function generateUniqueToken(): string
    {
        do {
            $token = Str::random(64);
        } while (self::where('token', $token)->exists());

        return $token;
    }

    /**
     * Get the frontend invitation URL.
     */
    public function getInvitationUrl(): string
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        return $frontendUrl.'/pets/invite/'.$this->token;
    }

    /**
     * Scope to get pending invitations.
     */
    public function scopePending($query)
    {
        return $query->where('status', RelationshipInvitationStatus::PENDING);
    }

    /**
     * Scope to get invitations for a specific pet.
     */
    public function scopeForPet($query, Pet $pet)
    {
        return $query->where('pet_id', $pet->id);
    }
}
