<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Filament\Resources\ContentTranslationResource\Pages\ListContentTranslations;
use App\Jobs\TranslateContentField;
use App\Models\ContentTranslation;
use App\Models\HelperProfile;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Livewire\Livewire;
use Tests\TestCase;

class ContentTranslationBulkRetryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $this->actingAs($admin);
    }

    public function test_bulk_retry_queues_each_selected_failed_record(): void
    {
        Queue::fake();
        $first = $this->failedTranslation('First source text');
        $second = $this->failedTranslation('Second source text');

        Livewire::test(ListContentTranslations::class)
            ->callTableBulkAction('retry', [$first, $second])
            ->assertNotified('2 failed translations queued for retry')
            ->assertDispatched('deselectAllTableRecords');

        $this->assertSame(ContentTranslation::STATUS_PENDING, $first->refresh()->status);
        $this->assertSame(ContentTranslation::STATUS_PENDING, $second->refresh()->status);

        $pushed = Queue::pushed(TranslateContentField::class);
        $this->assertCount(2, $pushed);
        $this->assertEqualsCanonicalizing(
            [$first->id, $second->id],
            $pushed->map(fn (TranslateContentField $job): int => $job->contentTranslationId)->all(),
        );
    }

    public function test_bulk_retry_skips_non_failed_records_even_when_stale(): void
    {
        Queue::fake();
        $failed = $this->failedTranslation('Live text');
        // Both of these are stale, so the service alone would retry them.
        // The bulk action must still skip them because their stored status is not failed.
        $stalePending = $this->translationWithStatus('Live text', ContentTranslation::STATUS_PENDING);
        $staleTranslated = $this->translationWithStatus('Live text', ContentTranslation::STATUS_TRANSLATED);

        Livewire::test(ListContentTranslations::class)
            ->callTableBulkAction('retry', [$failed, $stalePending, $staleTranslated])
            ->assertNotified('1 queued, 2 skipped');

        $this->assertSame(ContentTranslation::STATUS_PENDING, $failed->refresh()->status);
        $this->assertSame(ContentTranslation::STATUS_PENDING, $stalePending->refresh()->status);
        $this->assertSame(ContentTranslation::STATUS_TRANSLATED, $staleTranslated->refresh()->status);
        $this->assertSame(hash('sha256', 'Old source text'), $stalePending->refresh()->source_hash);
        $this->assertSame(hash('sha256', 'Old source text'), $staleTranslated->refresh()->source_hash);

        $pushed = Queue::pushed(TranslateContentField::class);
        $this->assertCount(1, $pushed);
        $this->assertSame($failed->id, $pushed->first()->contentTranslationId);
    }

    public function test_bulk_retry_reports_partial_failure_when_source_is_missing(): void
    {
        Queue::fake();
        $retryable = $this->failedTranslation('Live text');
        $orphaned = ContentTranslation::query()->create([
            'translatable_type' => HelperProfile::class,
            'translatable_id' => 999999,
            'field' => 'experience',
            'source_locale' => 'en',
            'source_hash' => hash('sha256', 'Missing'),
            'text' => [],
            'status' => ContentTranslation::STATUS_FAILED,
            'error' => 'Previous failure',
        ]);

        Livewire::test(ListContentTranslations::class)
            ->callTableBulkAction('retry', [$retryable, $orphaned])
            ->assertNotified('1 queued, 1 skipped');

        $this->assertSame(ContentTranslation::STATUS_PENDING, $retryable->refresh()->status);
        $this->assertSame(ContentTranslation::STATUS_FAILED, $orphaned->refresh()->status);

        $pushed = Queue::pushed(TranslateContentField::class);
        $this->assertCount(1, $pushed);
        $this->assertSame($retryable->id, $pushed->first()->contentTranslationId);
    }

    public function test_bulk_retry_reports_zero_success_without_misleading_feedback(): void
    {
        Queue::fake();
        $orphaned = ContentTranslation::query()->create([
            'translatable_type' => HelperProfile::class,
            'translatable_id' => 999999,
            'field' => 'experience',
            'source_locale' => 'en',
            'source_hash' => hash('sha256', 'Missing'),
            'text' => [],
            'status' => ContentTranslation::STATUS_FAILED,
            'error' => 'Previous failure',
        ]);

        Livewire::test(ListContentTranslations::class)
            ->callTableBulkAction('retry', [$orphaned])
            ->assertNotified('No translations queued');

        $this->assertSame(ContentTranslation::STATUS_FAILED, $orphaned->refresh()->status);
        Queue::assertNothingPushed();
    }

    private function failedTranslation(string $sourceText): ContentTranslation
    {
        $profile = HelperProfile::factory()->create(['experience' => $sourceText]);

        return ContentTranslation::query()->create([
            'translatable_type' => $profile->getMorphClass(),
            'translatable_id' => $profile->getKey(),
            'field' => 'experience',
            'source_locale' => 'en',
            'source_hash' => hash('sha256', 'Old source text'),
            'text' => [],
            'status' => ContentTranslation::STATUS_FAILED,
            'error' => 'Previous failure',
        ]);
    }

    private function translationWithStatus(string $sourceText, string $status): ContentTranslation
    {
        $profile = HelperProfile::factory()->create(['experience' => $sourceText]);

        return ContentTranslation::query()->create([
            'translatable_type' => $profile->getMorphClass(),
            'translatable_id' => $profile->getKey(),
            'field' => 'experience',
            'source_locale' => 'en',
            'source_hash' => hash('sha256', 'Old source text'),
            'text' => ['vi' => 'Old translation'],
            'status' => $status,
        ]);
    }
}
