<?php

namespace App\Models;

use App\Enums\PetStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * @OA\Schema(
 *     schema="Pet",
 *     type="object",
 *     title="Pet",
 *     required={"id", "name", "breed", "country", "description", "status", "user_id", "pet_type_id"},
 *
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Whiskers"),
 *     @OA\Property(property="breed", type="string", example="Siamese"),
 *     @OA\Property(property="birthday", type="string", format="date", example="2020-01-01", nullable=true, description="Exact birthday (present only when birthday_precision=day). Deprecated: prefer component fields.", deprecated=true),
 *     @OA\Property(property="birthday_year", type="integer", example=2020, nullable=true, description="Birth year when known (year/month/day precision)."),
 *     @OA\Property(property="birthday_month", type="integer", example=5, nullable=true, description="Birth month when known (month/day precision)."),
 *     @OA\Property(property="birthday_day", type="integer", example=12, nullable=true, description="Birth day when known (day precision)."),
 *     @OA\Property(property="birthday_precision", type="string", enum={"day","month","year","unknown"}, example="month", description="Precision level for birthday components."),
 *     @OA\Property(property="country", type="string", example="VN", description="ISO 3166-1 alpha-2 country code"),
 *     @OA\Property(property="state", type="string", example="Hanoi", nullable=true),
 *     @OA\Property(property="city", type="string", example="Hanoi", nullable=true),
 *     @OA\Property(property="address", type="string", example="123 Main St", nullable=true),
 *     @OA\Property(property="description", type="string", example="A friendly pet."),
 *     @OA\Property(property="status", type="string", example="active"),
 *     @OA\Property(property="user_id", type="integer", example=5),
 *     @OA\Property(property="pet_type_id", type="integer", example=1)
 * )
 */
class Pet extends Model implements HasMedia
{
    use HasFactory, InteractsWithMedia, SoftDeletes;

    protected $fillable = [
        'pet_type_id',
        'name',
        'breed',
        'country',
        'state',
        'city',
        'address',
        'description',
        'user_id',
        'status',
        'birthday',
        'birthday_year',
        'birthday_month',
        'birthday_day',
        'birthday_precision',
    ];

    protected $casts = [
        'status' => PetStatus::class,
        'birthday' => 'date',
        'birthday_year' => 'integer',
        'birthday_month' => 'integer',
        'birthday_day' => 'integer',
    ];

    protected $appends = ['photo_url', 'photos'];

    /**
     * Override delete to implement status-based soft delete for business logic.
     * This maintains the DELETED status while also supporting Laravel's soft deletes.
     */
    public function delete()
    {
        if ($this->status !== PetStatus::DELETED) {
            $this->status = PetStatus::DELETED;
            $this->deleted_at = now();

            return $this->save();
        }

        // If already marked as DELETED, perform actual soft delete
        return parent::delete();
    }

    /**
     * Get the pet type this pet belongs to
     */
    public function petType(): BelongsTo
    {
        return $this->belongsTo(PetType::class);
    }

    /**
     * Get the user who owns this pet
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get photo URL attribute - returns URL from MediaLibrary.
     */
    public function getPhotoUrlAttribute()
    {
        $media = $this->getFirstMedia('photos');
        if (! $media) {
            return null;
        }

        // Only use thumb conversion if it has been generated
        if ($media->hasGeneratedConversion('thumb')) {
            return $media->getUrl('thumb');
        }

        // Fall back to original
        return $media->getUrl();
    }

    /**
     * Get all photos for this pet as an array.
     *
     * @return array<int, array{id: int, url: string, thumb_url: string|null, is_primary: bool}>
     */
    public function getPhotosAttribute(): array
    {
        $media = $this->getMedia('photos');
        $firstId = $media->first()?->id;

        return $media->map(function ($item) use ($firstId) {
            // Get original URL as fallback
            $originalUrl = $item->getUrl();

            // Only use conversion URL if it exists (conversion completed)
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
     * Get medical records for this pet
     */
    public function medicalRecords(): HasMany
    {
        return $this->hasMany(MedicalRecord::class);
    }

    /**
     * Get weight histories for this pet
     */
    public function weightHistories(): HasMany
    {
        return $this->hasMany(WeightHistory::class);
    }

    /**
     * Get medical notes for this pet
     */
    public function medicalNotes(): HasMany
    {
        return $this->hasMany(MedicalNote::class);
    }

    /**
     * Get vaccinations for this pet
     */
    public function vaccinations(): HasMany
    {
        return $this->hasMany(VaccinationRecord::class);
    }

    /**
     * Get microchips for this pet
     */
    public function microchips(): HasMany
    {
        return $this->hasMany(PetMicrochip::class);
    }

    /**
     * Get comments for this pet
     */
    public function comments(): HasMany
    {
        return $this->hasMany(PetComment::class);
    }

    /**
     * Get placement requests for this pet
     */
    public function placementRequests(): HasMany
    {
        return $this->hasMany(PlacementRequest::class);
    }

    /**
     * Get ownership history for this pet
     */
    public function ownershipHistory(): HasMany
    {
        return $this->hasMany(OwnershipHistory::class);
    }

    /**
     * Get foster assignments for this pet
     */
    public function fosterAssignments(): HasMany
    {
        return $this->hasMany(FosterAssignment::class);
    }

    /**
     * Get active foster assignment for this pet
     */
    public function activeFosterAssignment(): HasOne
    {
        return $this->hasOne(FosterAssignment::class)->where('status', 'active');
    }

    /**
     * Calculate the age of the pet in years.
     * Returns the difference between current year and birthday year.
     */
    public function getAge(): int
    {
        if (! $this->birthday) {
            return 0;
        }

        return now()->year - $this->birthday->year;
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
        $this->addMediaConversion('thumb')
            ->fit(\Spatie\Image\Enums\Fit::Crop, 256, 256);

        $this->addMediaConversion('medium')
            ->width(1024)
            ->height(1024);

        $this->addMediaConversion('webp')
            ->fit(\Spatie\Image\Enums\Fit::Crop, 256, 256)
            ->format('webp');
    }

    /**
     * Boot the model and add global scope to hide deleted pets.
     */
    protected static function booted()
    {
        static::addGlobalScope('not_deleted', function ($query) {
            $query->where('status', '!=', PetStatus::DELETED->value);
        });
    }
}
