<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ResourceInvitationStatus;
use App\Enums\ResourceInvitationType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class ResourceInvitation extends Model
{
    protected $fillable = [
        'type',
        'token',
        'invited_by_user_id',
        'status',
        'expires_at',
        'accepted_by_user_id',
        'accepted_at',
        'declined_at',
        'revoked_at',
    ];

    protected $casts = [
        'type' => ResourceInvitationType::class,
        'status' => ResourceInvitationStatus::class,
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'declined_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function acceptedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by_user_id');
    }

    /**
     * @return HasOne<PetResourceInvitation, $this>
     */
    public function petDetail(): HasOne
    {
        return $this->hasOne(PetResourceInvitation::class, 'resource_invitation_id');
    }

    /**
     * @return HasOne<GroupResourceInvitation, $this>
     */
    public function groupDetail(): HasOne
    {
        return $this->hasOne(GroupResourceInvitation::class, 'resource_invitation_id');
    }

    /**
     * Whether the invitation is still pending and unexpired (read-only; does not mutate).
     */
    public function isPendingAndUnexpired(): bool
    {
        return $this->status === ResourceInvitationStatus::PENDING
            && $this->expires_at->isFuture();
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
     * Frontend invitation URL for the shared /invite/:token route.
     */
    public function getInvitationUrl(): string
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        return $frontendUrl.'/invite/'.$this->token;
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', ResourceInvitationStatus::PENDING);
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeOfType(Builder $query, ResourceInvitationType $type): Builder
    {
        return $query->where('type', $type);
    }
}
