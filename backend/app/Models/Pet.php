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

class Pet extends Model implements HasMedia
{
    use HasFactory, InteractsWithMedia, SoftDeletes;

    protected $fillable = [
        'pet_type_id',
        'name',
        'breed',
        'location',
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

    protected $appends = ['photo_url'];

    /**
     * Boot the model and add global scope to hide deleted pets.
     */
    protected static function booted()
    {
        static::addGlobalScope('not_deleted', function ($query) {
            $query->where('status', '!=', PetStatus::DELETED->value);
        });
    }

    /**
     * Override delete to implement status-based soft delete for business logic.
     * This maintains the DELETED status while also supporting Laravel's soft deletes.
     */
    public function delete()
    {
        if ($this->status !== PetStatus::DELETED) {
            $this->status = PetStatus::DELETED;

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
        // Try to get thumb conversion first, fall back to original
        return $this->getFirstMediaUrl('photos', 'thumb') ?: $this->getFirstMediaUrl('photos') ?: null;
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
}
