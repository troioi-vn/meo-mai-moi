<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PetRelationshipType;
use App\Enums\PetSex;
use App\Enums\PetStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

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

    public function habits(): BelongsToMany
    {
        return $this->belongsToMany(Habit::class, 'habit_pet')
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
     * Get the latest recorded weight for this pet.
     */
    public function latestWeight(): HasOne
    {
        return $this->hasOne(WeightHistory::class)->latestOfMany('record_date');
    }

    /**
     * Get vaccinations for this pet
     */
    public function vaccinations(): HasMany
    {
        return $this->hasMany(VaccinationRecord::class);
    }

    /**
     * Add lightweight health summary fields used by pet list cards.
     */
    public function scopeWithCardHealthSummary(Builder $query): Builder
    {
        $today = today()->toDateString();
        $thirtyDaysFromNow = today()->addDays(30)->toDateString();

        return $query
            ->addSelect([
                'latest_weight_kg' => WeightHistory::query()
                    ->select('weight_kg')
                    ->whereColumn('pet_id', 'pets.id')
                    ->orderByDesc('record_date')
                    ->orderByDesc('id')
                    ->limit(1),
                'latest_weight_record_date' => WeightHistory::query()
                    ->select('record_date')
                    ->whereColumn('pet_id', 'pets.id')
                    ->orderByDesc('record_date')
                    ->orderByDesc('id')
                    ->limit(1),
                'previous_weight_kg' => WeightHistory::query()
                    ->select('weight_kg')
                    ->whereColumn('pet_id', 'pets.id')
                    ->orderByDesc('record_date')
                    ->orderByDesc('id')
                    ->offset(1)
                    ->limit(1),
                'previous_weight_record_date' => WeightHistory::query()
                    ->select('record_date')
                    ->whereColumn('pet_id', 'pets.id')
                    ->orderByDesc('record_date')
                    ->orderByDesc('id')
                    ->offset(1)
                    ->limit(1),
            ])
            ->withExists([
                'vaccinations as has_overdue_vaccinations' => static fn (Builder $vaccinations) => $vaccinations
                    ->whereNull('completed_at')
                    ->whereNotNull('due_at')
                    ->whereDate('due_at', '<', $today),
                'vaccinations as has_due_soon_vaccinations' => static fn (Builder $vaccinations) => $vaccinations
                    ->whereNull('completed_at')
                    ->whereNotNull('due_at')
                    ->whereDate('due_at', '>=', $today)
                    ->whereDate('due_at', '<=', $thirtyDaysFromNow),
                'vaccinations as has_future_vaccinations' => static fn (Builder $vaccinations) => $vaccinations
                    ->whereNull('completed_at')
                    ->whereNotNull('due_at')
                    ->whereDate('due_at', '>', $thirtyDaysFromNow),
            ]);
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

        return $this->birthday->age;
    }

    /**
     * Get compact health summary for list cards without triggering extra queries.
     *
     * @return array{
     *     latest_weight_kg: float|string|null,
     *     latest_weight_record_date: string|null,
     *     previous_weight_kg: float|string|null,
     *     previous_weight_record_date: string|null,
     *     vaccination_status: 'up_to_date'|'overdue'|'due_soon'|'unknown'
     * }|null
     */
    public function getHealthSummaryAttribute(): ?array
    {
        $latestWeightRecord = $this->relationLoaded('latestWeight') ? $this->getRelation('latestWeight') : null;
        $latestWeightKg = null;
        $latestWeightRecordDate = null;

        if ($latestWeightRecord instanceof WeightHistory) {
            $latestWeightKg = $latestWeightRecord->weight_kg;
            $latestWeightRecordDate = $latestWeightRecord->record_date?->toDateString();
        } elseif (array_key_exists('latest_weight_kg', $this->attributes)) {
            $latestWeightKg = $this->attributes['latest_weight_kg'];
            $latestWeightRecordDate = $this->attributes['latest_weight_record_date'] ?? null;
        }

        $previousWeightKg = $this->attributes['previous_weight_kg'] ?? null;
        $previousWeightRecordDate = $this->attributes['previous_weight_record_date'] ?? null;

        $vaccinationStatus = null;

        if (array_key_exists('has_overdue_vaccinations', $this->attributes)) {
            $hasOverdueVaccinations = (bool) $this->attributes['has_overdue_vaccinations'];
            $hasDueSoonVaccinations = (bool) ($this->attributes['has_due_soon_vaccinations'] ?? false);
            $hasFutureVaccinations = (bool) ($this->attributes['has_future_vaccinations'] ?? false);

            $vaccinationStatus = match (true) {
                $hasOverdueVaccinations => 'overdue',
                $hasDueSoonVaccinations => 'due_soon',
                $hasFutureVaccinations => 'up_to_date',
                default => 'unknown',
            };
        }

        if (
            $latestWeightKg === null &&
            $latestWeightRecordDate === null &&
            $previousWeightKg === null &&
            $previousWeightRecordDate === null &&
            $vaccinationStatus === null
        ) {
            return null;
        }

        return [
            'latest_weight_kg' => $latestWeightKg,
            'latest_weight_record_date' => $latestWeightRecordDate,
            'previous_weight_kg' => $previousWeightKg,
            'previous_weight_record_date' => $previousWeightRecordDate,
            'vaccination_status' => $vaccinationStatus ?? 'unknown',
        ];
    }

    /**
     * Register media collections for this model.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('photos')
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/svg+xml']);

        $this->addMediaCollection('deleted_photos')
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/svg+xml']);
    }

    /**
     * Register media conversions for this model.
     */
    public function registerMediaConversions(?Media $media = null): void
    {
        // Skip conversions during testing to avoid parallel test conflicts
        if (app()->environment('testing')) {
            return;
        }

        $this->addMediaConversion('thumb')
            ->fit(Fit::Crop, 256, 256);

        $this->addMediaConversion('medium')
            ->width(1024)
            ->height(1024);

        $this->addMediaConversion('webp')
            ->fit(Fit::Crop, 256, 256)
            ->format('webp');
    }

    /**
     * Boot the model and add global scope to hide deleted pets.
     */
    protected static function booted(): void
    {
        static::addGlobalScope('not_deleted', function ($query): void {
            $query->where('status', '!=', PetStatus::DELETED->value);
        });

        // Create ownership relationship when pet is created
        static::created(function (Pet $pet): void {
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

        static::updated(function (Pet $pet): void {
            if (! $pet->wasChanged('status')) {
                return;
            }

            if (! in_array($pet->status, [PetStatus::LOST, PetStatus::DECEASED], true)) {
                return;
            }

            $pet->habits()->detach();
        });
    }
}
