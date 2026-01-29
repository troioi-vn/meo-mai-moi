<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\PlacementResponseStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PlacementRequest extends Model
{
    // ...existing code...
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'pet_id',
        'user_id',
        'request_type',
        'status',
        'notes',
        'expires_at',
        'start_date',
        'end_date',
    ];

    protected $casts = [
        'request_type' => PlacementRequestType::class,
        'status' => PlacementRequestStatus::class,
        'expires_at' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    // Legacy cat() relation removed after Pet-only migration.

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transferRequests()
    {
        return $this->hasMany(TransferRequest::class);
    }

    /**
     * Get all responses to this placement request.
     */
    public function responses(): HasMany
    {
        return $this->hasMany(PlacementRequestResponse::class);
    }

    /**
     * Get the response count attribute for admin display
     */
    public function getResponseCountAttribute(): int
    {
        return $this->responses()->count();
    }

    /**
     * Get the accepted response for this placement request.
     */
    public function acceptedResponse()
    {
        return PlacementRequestResponse::where('placement_request_id', $this->id)
            ->accepted()
            ->first();
    }

    /**
     * Check if a helper profile has already responded to this placement request.
     */
    public function hasResponseFrom(int $helperProfileId): bool
    {
        return $this->responses()
            ->where('helper_profile_id', $helperProfileId)
            ->exists();
    }

    /**
     * Check if a helper profile is blocked from responding (was rejected before).
     */
    public function isHelperBlocked(int $helperProfileId): bool
    {
        return PlacementRequestResponse::where('placement_request_id', $this->id)
            ->blockingReResponse()
            ->where('helper_profile_id', $helperProfileId)
            ->exists();
    }

    /**
     * Check if a helper profile can respond to this placement request.
     * They can respond if:
     * - They have never responded, OR
     * - Their previous response was cancelled (not rejected)
     */
    public function canHelperRespond(int $helperProfileId): bool
    {
        // If blocked (rejected), cannot respond
        if ($this->isHelperBlocked($helperProfileId)) {
            return false;
        }

        // Check if there's an active response already
        $activeResponse = PlacementRequestResponse::where('placement_request_id', $this->id)
            ->active()
            ->where('helper_profile_id', $helperProfileId)
            ->exists();

        return ! $activeResponse;
    }

    /**
     * Check if the placement request is active (open).
     */
    public function isActive(): bool
    {
        return $this->status === PlacementRequestStatus::OPEN;
    }

    /**
     * Mark the placement request as fulfilled.
     */
    public function markAsFulfilled(): void
    {
        $this->update(['status' => PlacementRequestStatus::FULFILLED]);
    }

    /**
     * Mark the placement request as cancelled.
     */
    public function markAsCancelled(): void
    {
        $this->update(['status' => PlacementRequestStatus::CANCELLED]);
    }

    /**
     * Reject all other pending responses to this placement request.
     */
    public function rejectOtherResponses(int $acceptedResponseId): void
    {
        $this->responses()
            ->where('id', '!=', $acceptedResponseId)
            ->where('status', PlacementResponseStatus::RESPONDED)
            ->update([
                'status' => PlacementResponseStatus::REJECTED,
                'rejected_at' => now(),
            ]);
    }

    /**
     * Scope for active (open) placement requests.
     */
    public function scopeActive($query)
    {
        return $query->where('status', PlacementRequestStatus::OPEN);
    }
}
