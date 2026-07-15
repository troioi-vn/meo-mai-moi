<?php

declare(strict_types=1);

namespace App\Listeners;

use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Spatie\MediaLibrary\MediaCollections\Events\MediaHasBeenAddedEvent;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Throwable;

final class RecordMediaImageDimensions
{
    public function __construct(private readonly ImageManager $images) {}

    public function handle(MediaHasBeenAddedEvent $event): void
    {
        $this->record($event->media);
    }

    public function record(Media $media): void
    {
        if (! str_starts_with($media->mime_type, 'image/')) {
            return;
        }

        $stream = Storage::disk($media->disk)
            ->readStream($media->getPathRelativeToRoot());

        if ($stream === false) {
            return;
        }

        try {
            $image = $this->images->decodeStream($stream);

            $media
                ->setCustomProperty('image.width', $image->width())
                ->setCustomProperty('image.height', $image->height())
                ->saveQuietly();
        } catch (Throwable) {
            // Some valid media types (notably SVG with the GD driver) do not expose
            // raster dimensions. Leave dimensions absent rather than guessing.
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
    }
}
