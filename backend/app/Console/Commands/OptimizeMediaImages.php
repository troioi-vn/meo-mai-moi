<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Listeners\RecordMediaImageDimensions;
use App\Models\HelperProfile;
use App\Models\MedicalRecord;
use App\Models\Pet;
use App\Models\User;
use App\Models\VaccinationRecord;
use Illuminate\Console\Command;
use Illuminate\Console\ConfirmableTrait;
use Spatie\MediaLibrary\Conversions\FileManipulator;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\MediaLibrary\ResponsiveImages\Jobs\GenerateResponsiveImagesJob;

final class OptimizeMediaImages extends Command
{
    use ConfirmableTrait;

    protected $signature = 'media:optimize-images
        {--dry-run : Count affected images without changing them}
        {--force : Run without confirmation in production}';

    protected $description = 'Backfill dimensions, responsive images, and current WebP conversions for existing Media Library images';

    /** @var array<class-string, array<string, list<string>>> */
    private const TARGETS = [
        Pet::class => ['photos' => ['webp']],
        HelperProfile::class => ['photos' => ['webp']],
        MedicalRecord::class => ['photos' => ['webp']],
        VaccinationRecord::class => ['photo' => ['medium', 'webp']],
        User::class => ['avatar' => ['avatar_webp']],
    ];

    public function handle(
        RecordMediaImageDimensions $dimensions,
        FileManipulator $files,
    ): int {
        if (! $this->confirmToProceed()) {
            return self::FAILURE;
        }

        $query = Media::query()
            ->whereIn('mime_type', ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
            ->where(function ($query): void {
                foreach (self::TARGETS as $modelType => $collections) {
                    $query->orWhere(function ($query) use ($modelType, $collections): void {
                        $query->where('model_type', $modelType)
                            ->whereIn('collection_name', array_keys($collections));
                    });
                }
            });

        $count = $query->count();
        if ($this->option('dry-run')) {
            $this->info("{$count} image(s) would be optimized.");

            return self::SUCCESS;
        }

        $progress = $this->output->createProgressBar($count);

        $query->orderBy('id')->chunkById(100, function ($mediaItems) use ($dimensions, $files, $progress): void {
            foreach ($mediaItems as $media) {
                $dimensions->record($media);

                $conversionNames = self::TARGETS[$media->model_type][$media->collection_name];
                $files->createDerivedFiles(
                    $media,
                    onlyConversionNames: $conversionNames,
                    queueAll: true,
                );

                $job = new GenerateResponsiveImagesJob($media);
                $connection = config('media-library.queue_connection_name');
                $queue = config('media-library.queue_name');

                if (is_string($connection) && $connection !== '') {
                    $job->onConnection($connection);
                }
                if (is_string($queue) && $queue !== '') {
                    $job->onQueue($queue);
                }

                dispatch($job);

                $progress->advance();
            }
        });

        $progress->finish();
        $this->newLine();
        $this->info('Media image optimization was queued successfully.');

        return self::SUCCESS;
    }
}
