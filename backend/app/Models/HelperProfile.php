<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\HelperProfileApprovalStatus;
use App\Enums\HelperProfileStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class HelperProfile extends Model implements HasMedia
{
    use HasFactory;
    use InteractsWithMedia;
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'country',
        'address',
        'city_id',
        'city',
        'state',
        'zip_code',
        'phone_number',
        'contact_details',
        'experience',
        'offer',
        'has_pets',
        'has_children',
        'request_types',
        'approval_status',
        'status',
        'archived_at',
        'restored_at',
    ];

    protected $casts = [
        'has_pets' => 'boolean',
        'has_children' => 'boolean',
        'contact_details' => 'array',
        'request_types' => 'array',
        'approval_status' => HelperProfileApprovalStatus::class,
        'status' => HelperProfileStatus::class,
        'archived_at' => 'datetime',
        'restored_at' => 'datetime',
    ];

    protected $appends = ['photos'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function cities(): BelongsToMany
    {
        return $this->belongsToMany(City::class, 'helper_profile_city');
    }

    public function petTypes(): BelongsToMany
    {
        return $this->belongsToMany(PetType::class, 'helper_profile_pet_type');
    }

    /**
     * Get all responses made with this helper profile.
     */
    public function placementResponses(): HasMany
    {
        return $this->hasMany(PlacementRequestResponse::class);
    }

    /**
     * Check if the profile has any associated placement requests.
     */
    public function hasPlacementRequests(): bool
    {
        return $this->placementResponses()->exists();
    }

    /**
     * Register media collections for this model.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('photos')
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/svg+xml']);
    }

    /**
     * Register media conversions for this model.
     */
    public function registerMediaConversions(?Media $media = null): void
    {
        if (app()->environment('testing')) {
            return;
        }

        $this->addMediaConversion('thumb')
            ->fit(Fit::Crop, 256, 256);

        $this->addMediaConversion('medium')
            ->width(1024)
            ->height(1024);

        $this->addMediaConversion('webp')
            ->width(1024)
            ->height(1024)
            ->format('webp');
    }

    /**
     * Get helper profile photos in the same API shape used by other image-bearing models.
     *
     * @return array<int, array{id: int, url: string, thumb_url: string|null, is_primary: bool}>
     */
    public function getPhotosAttribute(): array
    {
        $media = $this->getMedia('photos');
        $firstId = $media->first()?->id;

        return $media->map(function (Media $item) use ($firstId): array {
            $originalUrl = $item->getUrl();
            $mediumUrl = $item->hasGeneratedConversion('medium') ? $item->getUrl('medium') : $originalUrl;
            $thumbUrl = $item->hasGeneratedConversion('thumb') ? $item->getUrl('thumb') : $originalUrl;

            return [
                'id' => $item->id,
                'url' => $mediumUrl,
                'thumb_url' => $thumbUrl,
                'is_primary' => $item->id === $firstId,
            ];
        })->toArray();
    }

    /**
     * Check if a user can view this helper profile.
     *
     * A user can view a helper profile if:
     * - They are the owner of the helper profile
     * - They own a pet that has a PlacementRequest with a response from this helper profile
     */
    public function isVisibleToUser(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        // Owner can always view
        if ($this->user_id === $user->id) {
            return true;
        }

        // Check if user has a pet with a PlacementRequest that has a response from this helper profile
        return PlacementRequestResponse::query()
            ->where('helper_profile_id', $this->id)
            ->whereHas('placementRequest.pet.owners', function ($query) use ($user): void {
                $query->where('users.id', $user->id);
            })
            ->exists();
    }

    public function isPubliclyVisible(): bool
    {
        return $this->status === HelperProfileStatus::PUBLIC
            && $this->approval_status === HelperProfileApprovalStatus::APPROVED;
    }

    public function isActive(): bool
    {
        return $this->status?->isActive() ?? false;
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', HelperProfileStatus::activeValues());
    }

    public function scopePubliclyVisible(Builder $query): Builder
    {
        return $query
            ->where('status', HelperProfileStatus::PUBLIC)
            ->where('approval_status', HelperProfileApprovalStatus::APPROVED);
    }
}
