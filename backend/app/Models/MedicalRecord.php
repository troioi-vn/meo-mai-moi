<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class MedicalRecord extends Model implements HasMedia
{
    use HasFactory;
    use InteractsWithMedia;

    protected $fillable = [
        'pet_id',
        'record_type',
        'description',
        'record_date',
        'vet_name',
    ];

    protected $casts = [
        'record_date' => 'date',
    ];

    protected $appends = ['photos'];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    /**
     * Register media collections for this model.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('photos')
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

        $this->addMediaConversion('medium')
            ->width(1024)
            ->height(1024);
    }

    /**
     * Get all photos for this medical record as an array.
     *
     * @return array<int, array{id: int, url: string, thumb_url: string|null}>
     */
    public function getPhotosAttribute(): array
    {
        $media = $this->getMedia('photos');

        return $media->map(function ($item) {
            $originalUrl = $item->getUrl();
            $mediumUrl = $item->hasGeneratedConversion('medium') ? $item->getUrl('medium') : $originalUrl;
            $thumbUrl = $item->hasGeneratedConversion('thumb') ? $item->getUrl('thumb') : $originalUrl;

            return [
                'id' => $item->id,
                'url' => $mediumUrl,
                'thumb_url' => $thumbUrl,
            ];
        })->toArray();
    }
}
