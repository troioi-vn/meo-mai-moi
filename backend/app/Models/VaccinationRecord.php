<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\VaccinationRecordFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class VaccinationRecord extends Model implements HasMedia
{
    /** @use HasFactory<VaccinationRecordFactory> */
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

    protected $appends = ['photo_url', 'photo', 'is_overdue'];

    /**
     * @return BelongsTo<Pet, $this>
     */
    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    /**
     * Application calendar date used by the authoritative overdue predicate.
     */
    public static function overdueCalendarDate(): string
    {
        return today()->toDateString();
    }

    /**
     * Register media collections for this model.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('photo')
            ->singleFile()
            ->withResponsiveImagesIf(! app()->environment('testing'))
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
            ->fit(Fit::Crop, 256, 256);

        $this->addMediaConversion('medium')
            ->width(1024)
            ->height(1024);

        $this->addMediaConversion('webp')
            ->withResponsiveImages()
            ->width(1024)
            ->height(1024)
            ->format('webp');
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
     * Get the structured photo object while preserving photo_url for existing clients.
     *
     * @return array{id: int, url: string, thumb_url: string|null, medium_url: string|null, webp_url: string|null, srcset: string|null, sources: array<int, array{type: string, srcset: string}>, width: int|null, height: int|null, is_primary: bool, processing: bool}|null
     */
    public function getPhotoAttribute(): ?array
    {
        $media = $this->getFirstMedia('photo');

        if (! $media) {
            return null;
        }

        return MediaImageSerializer::serialize(
            $media,
            isPrimary: true,
            displayConversion: 'medium',
            thumbConversion: 'thumb',
            mediumConversion: 'medium',
            webpConversion: 'webp',
        );
    }

    /**
     * Scope to only active (non-completed) vaccination records.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('completed_at');
    }

    /**
     * Scope to only completed vaccination records.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->whereNotNull('completed_at');
    }

    /**
     * Scope to overdue incomplete renewals whose due date is strictly before today.
     *
     * Overdue is a subset of active: completed_at is null, due_at is non-null, and
     * the calendar due date is earlier than today in the application timezone.
     * A record due today is not overdue.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeOverdue(Builder $query): Builder
    {
        return $query
            ->whereNull('completed_at')
            ->whereNotNull('due_at')
            ->whereDate('due_at', '<', self::overdueCalendarDate());
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
     * Authoritative overdue predicate for serialization and domain checks.
     *
     * An incomplete renewal is overdue when due_at is set and its calendar date is
     * strictly earlier than today in the application timezone. Completed records
     * and records without a due date are never overdue.
     */
    public function isOverdue(): bool
    {
        if ($this->completed_at !== null || $this->due_at === null) {
            return false;
        }

        return $this->due_at->toDateString() < self::overdueCalendarDate();
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->isOverdue();
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
