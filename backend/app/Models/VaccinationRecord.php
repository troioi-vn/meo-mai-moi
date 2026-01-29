<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class VaccinationRecord extends Model implements HasMedia
{
    use HasFactory;
    use InteractsWithMedia;

    protected $fillable = [
        'pet_id',
        'vaccine_name',
        'administered_at',
        'due_at',
        'notes',
        'reminder_sent_at',
        'completed_at',
    ];

    protected $casts = [
        'administered_at' => 'date',
        'due_at' => 'date',
        'reminder_sent_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    protected $appends = ['photo_url'];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    /**
     * Register media collections for this model.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('photo')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/jpg', 'image/gif']);
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
            ->fit(\Spatie\Image\Enums\Fit::Crop, 256, 256);
    }

    /**
     * Get the photo URL for this vaccination record.
     */
    public function getPhotoUrlAttribute(): ?string
    {
        $media = $this->getFirstMedia('photo');

        if (! $media) {
            return null;
        }

        if ($media->hasGeneratedConversion('thumb')) {
            return $media->getUrl('thumb');
        }

        return $media->getUrl();
    }

    /**
     * Scope to only active (non-completed) vaccination records.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('completed_at');
    }

    /**
     * Scope to only completed vaccination records.
     */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->whereNotNull('completed_at');
    }

    /**
     * Check if this vaccination record is active (not completed).
     */
    public function isActive(): bool
    {
        return $this->completed_at === null;
    }

    /**
     * Check if this vaccination record is completed.
     */
    public function isCompleted(): bool
    {
        return $this->completed_at !== null;
    }

    /**
     * Mark this vaccination record as completed.
     */
    public function markAsCompleted(): void
    {
        $this->completed_at = now();
        $this->save();
    }
}
