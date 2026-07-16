<?php

declare(strict_types=1);

namespace Tests\Unit\Models;

use App\Models\HelperProfile;
use App\Models\MediaImageSerializer;
use App\Models\MedicalRecord;
use App\Models\Pet;
use App\Models\User;
use App\Models\VaccinationRecord;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Tests\TestCase;

class MediaImageSerializerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_serializes_recorded_dimensions_and_responsive_metadata(): void
    {
        $user = User::factory()->create();
        $media = Media::query()->create([
            'model_type' => User::class,
            'model_id' => $user->id,
            'collection_name' => 'avatar',
            'name' => 'photo',
            'file_name' => 'photo.jpg',
            'mime_type' => 'image/jpeg',
            'disk' => 'public',
            'conversions_disk' => 'public',
            'size' => 2048,
            'manipulations' => [],
            'custom_properties' => ['image' => ['width' => 1280, 'height' => 960]],
            'generated_conversions' => [],
            'responsive_images' => [
                'media_library_original' => [
                    'urls' => ['photo___media_library_original_640_480.jpg'],
                ],
            ],
            'order_column' => 1,
        ]);

        $serialized = MediaImageSerializer::serialize(
            $media,
            isPrimary: true,
            displayConversion: null,
            thumbConversion: null,
            mediumConversion: null,
            webpConversion: null,
        );

        $this->assertSame(1280, $serialized['width']);
        $this->assertSame(960, $serialized['height']);
        $this->assertStringContainsString('640w', $serialized['srcset']);
        $this->assertSame([], $serialized['sources']);
        $this->assertTrue($serialized['is_primary']);
        $this->assertFalse($serialized['processing']);
    }

    #[Test]
    public function upload_event_records_intrinsic_dimensions(): void
    {
        $user = User::factory()->create();
        $fixture = base_path('../frontend/public/icon-32.png');

        $media = $user->addMedia($fixture)
            ->preservingOriginal()
            ->toMediaCollection('avatar');

        $this->assertSame(32, $media->fresh()?->getCustomProperty('image.width'));
        $this->assertSame(32, $media->fresh()?->getCustomProperty('image.height'));
    }

    #[Test]
    public function image_models_enable_responsive_fallback_and_webp_generation(): void
    {
        $application = app();
        $environment = $application->environment();
        $application->instance('env', 'local');

        try {
            $models = [
                [new Pet, 'photos', 'webp'],
                [new HelperProfile, 'photos', 'webp'],
                [new MedicalRecord, 'photos', 'webp'],
                [new VaccinationRecord, 'photo', 'webp'],
                [new User, 'avatar', 'avatar_webp'],
            ];

            foreach ($models as [$model, $collectionName, $conversionName]) {
                $model->registerMediaCollections();
                $model->registerMediaConversions();

                $this->assertTrue($model->mediaCollections[$collectionName]->generateResponsiveImages);

                $conversion = collect($model->mediaConversions)
                    ->first(fn ($item) => $item->getName() === $conversionName);

                $this->assertNotNull($conversion);
                $this->assertTrue($conversion->shouldGenerateResponsiveImages());
            }
        } finally {
            $application->instance('env', $environment);
        }
    }

    #[Test]
    public function optimization_command_can_inventory_existing_images_without_writing(): void
    {
        $user = User::factory()->create();
        $user->addMedia(base_path('../frontend/public/icon-32.png'))
            ->preservingOriginal()
            ->toMediaCollection('avatar');

        $this->artisan('media:optimize-images', ['--dry-run' => true])
            ->expectsOutput('1 image(s) would be optimized.')
            ->assertSuccessful();
    }
}
