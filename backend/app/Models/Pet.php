<?php

namespace App\Models;

use App\Enums\PetRelationshipType;
use App\Enums\PetSex;
use App\Enums\PetStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
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
 *     required={"id", "name", "country", "description", "status", "created_by", "pet_type_id"},
 *
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Whiskers"),
 *     @OA\Property(property="sex", type="string", enum={"male","female","not_specified"}, example="male", description="Sex of the pet"),
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
 *     @OA\Property(property="created_by", type="integer", example=5, description="ID of user who created this pet"),
 *     @OA\Property(property="pet_type_id", type="integer", example=1)
 * )
 */
class Pet extends Model implements HasMedia
{
    use HasFactory;
    use InteractsWithMedia;
    use SoftDeletes;

    protected $fillable = [
        'pet_type_id',
        'name',
        'sex',
        'country',
        'state',
        'city_id',
        'city',
        'address',
        'description',
        'created_by',
        'status',
        'birthday',
        'birthday_year',
        'birthday_month',
        'birthday_day',
        'birthday_precision',
    ];

    protected $casts = [
        'status' => PetStatus::class,
        'sex' => PetSex::class,
        'birthday' => 'date',
        'birthday_year' => 'integer',
        'birthday_month' => 'integer',
        'birthday_day' => 'integer',
    ];

    protected $appends = ['photo_url', 'photos', 'user_id'];

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

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    /**
     * Get the user who created this pet
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Alias for creator() - get the user who created this pet
     */
    public function user(): BelongsTo
    {
        return $this->creator();
    }

    /**
     * Get all relationships for this pet
     */
    public function relationships(): HasMany
    {
        return $this->hasMany(PetRelationship::class);
    }

    /**
     * Get active relationships for this pet
     */
    public function activeRelationships(): HasMany
    {
        return $this->hasMany(PetRelationship::class)->whereNull('end_at');
    }

    /**
     * Get current owners of this pet
     */
    public function owners(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'pet_relationships')
            ->wherePivot('relationship_type', PetRelationshipType::OWNER->value)
            ->wherePivotNull('end_at')
            ->withPivot(['relationship_type', 'start_at', 'end_at', 'created_by'])
            ->withTimestamps();
    }

    /**
     * Get current fosters of this pet
     */
    public function fosters(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'pet_relationships')
            ->wherePivot('relationship_type', PetRelationshipType::FOSTER->value)
            ->wherePivotNull('end_at')
            ->withPivot(['relationship_type', 'start_at', 'end_at', 'created_by'])
            ->withTimestamps();
    }

    /**
     * Get current sitters of this pet
     */
    public function sitters(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'pet_relationships')
            ->wherePivot('relationship_type', PetRelationshipType::SITTER->value)
            ->wherePivotNull('end_at')
            ->withPivot(['relationship_type', 'start_at', 'end_at', 'created_by'])
            ->withTimestamps();
    }

    /**
     * Get current editors of this pet
     */
    public function editors(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'pet_relationships')
            ->wherePivot('relationship_type', PetRelationshipType::EDITOR->value)
            ->wherePivotNull('end_at')
            ->withPivot(['relationship_type', 'start_at', 'end_at', 'created_by'])
            ->withTimestamps();
    }

    /**
     * Get current viewers of this pet
     */
    public function viewers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'pet_relationships')
            ->wherePivot('relationship_type', PetRelationshipType::VIEWER->value)
            ->wherePivotNull('end_at')
            ->withPivot(['relationship_type', 'start_at', 'end_at', 'created_by'])
            ->withTimestamps();
    }

    /**
     * Check if user has specific relationship type with this pet
     */
    public function hasRelationshipWith(User $user, PetRelationshipType $type): bool
    {
        return $this->relationships()
            ->where('user_id', $user->id)
            ->where('relationship_type', $type)
            ->whereNull('end_at')
            ->exists();
    }

    /**
     * Check if user is an owner of this pet
     */
    public function isOwnedBy(User $user): bool
    {
        return $this->hasRelationshipWith($user, PetRelationshipType::OWNER);
    }

    /**
     * Check if user can edit this pet (owner or editor)
     */
    public function canBeEditedBy(User $user): bool
    {
        return $this->hasRelationshipWith($user, PetRelationshipType::OWNER) ||
               $this->hasRelationshipWith($user, PetRelationshipType::EDITOR);
    }

    /**
     * Check if user can view this pet (owner, editor, viewer, foster, or sitter)
     */
    public function canBeViewedBy(User $user): bool
    {
        return $this->hasRelationshipWith($user, PetRelationshipType::OWNER) ||
               $this->hasRelationshipWith($user, PetRelationshipType::EDITOR) ||
               $this->hasRelationshipWith($user, PetRelationshipType::VIEWER) ||
               $this->hasRelationshipWith($user, PetRelationshipType::FOSTER) ||
               $this->hasRelationshipWith($user, PetRelationshipType::SITTER);
    }

    /**
     * Get user_id attribute for backward compatibility.
     * Returns the ID of the user who created the pet.
     */
    public function getUserIdAttribute(): int
    {
        return $this->created_by;
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
     * Get categories for this pet.
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'pet_categories')
            ->withTimestamps();
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
     * Get ownership history for this pet (via relationships)
     */
    public function ownershipHistory(): HasMany
    {
        return $this->hasMany(PetRelationship::class)
            ->where('relationship_type', PetRelationshipType::OWNER)
            ->orderBy('start_at', 'desc');
    }

    // TODO: Foster assignments removed - reimplment when rehoming flow is rebuilt
    // public function fosterAssignments(): HasMany
    // public function activeFosterAssignment(): HasOne

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

        // Create ownership relationship when pet is created
        static::created(function (Pet $pet) {
            if ($pet->created_by) {
                // Check if relationship already exists (to avoid duplicates from factory)
                $exists = PetRelationship::where('pet_id', $pet->id)
                    ->where('user_id', $pet->created_by)
                    ->where('relationship_type', PetRelationshipType::OWNER)
                    ->whereNull('end_at')
                    ->exists();

                if (! $exists) {
                    PetRelationship::create([
                        'user_id' => $pet->created_by,
                        'pet_id' => $pet->id,
                        'relationship_type' => PetRelationshipType::OWNER,
                        'start_at' => now(),
                        'end_at' => null,
                        'created_by' => $pet->created_by,
                    ]);
                }
            }
        });
    }
}
