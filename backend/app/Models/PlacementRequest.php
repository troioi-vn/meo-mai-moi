<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\PlacementResponseStatus;
use Database\Factories\PlacementRequestFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PlacementRequest extends Model
{
    // ...existing code...
    /** @use HasFactory<PlacementRequestFactory> */
    use HasFactory;

    use SoftDeletes;

    protected $fillable = [
        'pet_id',
        'user_id',
        'request_type',
        'status',
        'notes',
        'notes_locale',
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

    /**
     * @return BelongsTo<Pet, $this>
     */
    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    // Legacy cat() relation removed after Pet-only migration.

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<TransferRequest, $this>
     */
    public function transferRequests(): HasMany
    {
        return $this->hasMany(TransferRequest::class);
    }

    /**
     * Get all responses to this placement request.
     *
     * @return HasMany<PlacementRequestResponse, $this>
     */
    public function responses(): HasMany
    {
        return $this->hasMany(PlacementRequestResponse::class);
    }

    /**
     * @return MorphMany<ContentTranslation, $this>
     */
    public function contentTranslations(): MorphMany
    {
        return $this->morphMany(ContentTranslation::class, 'translatable');
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
    public function acceptedResponse(): ?PlacementRequestResponse
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
     * Whether this request can be answered without a pre-built helper profile.
     *
     * Paid fostering and pet sitting involve money or scheduling, so they keep
     * the full helper profile requirement. This is the single source of truth
     * for that rule; the action calculator and the response controller both
     * read it rather than repeating the type list.
     */
    public function allowsQuickResponse(): bool
    {
        return $this->status === PlacementRequestStatus::OPEN
            && in_array($this->request_type, [
                PlacementRequestType::PERMANENT,
                PlacementRequestType::FOSTER_FREE,
            ], true);
    }

    /**
     * Whether the given user already has an active response to this request,
     * through any of their helper profiles.
     *
     * canHelperRespond() is keyed on a single helper_profile_id, which was
     * enough while profiles were only ever created by hand. Quick responses
     * create profiles automatically, so a user with more than one profile
     * could otherwise respond twice to the same request.
     */
    public function hasActiveResponseFromUser(int $userId): bool
    {
        return PlacementRequestResponse::query()
            ->where('placement_request_id', $this->id)
            ->active()
            ->whereHas('helperProfile', fn ($query) => $query->where('user_id', $userId))
            ->exists();
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

    protected static function booted(): void
    {
        static::saving(function (PlacementRequest $placementRequest): void {
            if (! $placementRequest->isDirty('notes')) {
                return;
            }

            $notes = is_string($placementRequest->notes) ? trim($placementRequest->notes) : '';
            $placementRequest->notes_locale = $notes !== '' ? app()->getLocale() : null;
        });
    }

    /**
     * Scope for active (open) placement requests.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', PlacementRequestStatus::OPEN);
    }
}
