<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Jobs\TranslateContentField;
use App\Models\ContentTranslation;
use App\Models\HelperProfile;
use App\Services\Translation\ContentTranslationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ContentTranslationRetryTest extends TestCase
{
    use RefreshDatabase;

    public function test_retry_queues_current_source_text_and_refreshes_status(): void
    {
        Queue::fake();
        $profile = HelperProfile::factory()->create(['experience' => 'Current source text']);
        $translation = ContentTranslation::query()->create([
            'translatable_type' => $profile->getMorphClass(),
            'translatable_id' => $profile->getKey(),
            'field' => 'experience',
            'source_locale' => 'en',
            'source_hash' => hash('sha256', 'Old source text'),
            'text' => ['vi' => 'Old translation'],
            'status' => ContentTranslation::STATUS_FAILED,
            'error' => 'Previous failure',
        ]);

        $service = app(ContentTranslationService::class);
        $this->assertTrue($service->isStale($translation));
        $this->assertTrue($service->retry($translation));

        $translation->refresh();
        $this->assertSame(ContentTranslation::STATUS_PENDING, $translation->status);
        $this->assertSame(hash('sha256', 'Current source text'), $translation->source_hash);
        $this->assertNull($translation->error);
        $this->assertNull($translation->translated_at);

        Queue::assertPushed(
            TranslateContentField::class,
            fn (TranslateContentField $job): bool => $job->contentTranslationId === $translation->id
                && $job->sourceText === 'Current source text',
        );
    }

    public function test_retry_refuses_missing_source_record(): void
    {
        Queue::fake();
        $translation = ContentTranslation::query()->create([
            'translatable_type' => HelperProfile::class,
            'translatable_id' => 999999,
            'field' => 'experience',
            'source_locale' => 'en',
            'source_hash' => hash('sha256', 'Missing'),
            'text' => [],
            'status' => ContentTranslation::STATUS_FAILED,
        ]);

        $this->assertFalse(app(ContentTranslationService::class)->retry($translation));
        Queue::assertNothingPushed();
    }

    public function test_retry_refuses_current_pending_or_translated_records(): void
    {
        Queue::fake();
        $sourceHash = hash('sha256', 'Current source text');

        foreach ([ContentTranslation::STATUS_PENDING, ContentTranslation::STATUS_TRANSLATED] as $status) {
            $profile = HelperProfile::factory()->create(['experience' => 'Current source text']);
            $translation = ContentTranslation::query()->create([
                'translatable_type' => $profile->getMorphClass(),
                'translatable_id' => $profile->getKey(),
                'field' => 'experience',
                'source_locale' => 'en',
                'source_hash' => $sourceHash,
                'text' => ['vi' => 'Current translation'],
                'status' => $status,
            ]);

            $this->assertFalse(app(ContentTranslationService::class)->retry($translation));
        }

        Queue::assertNothingPushed();
    }
}
