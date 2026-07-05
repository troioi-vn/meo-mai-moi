<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\ContentTranslation;
use App\Services\Translation\ContentTranslationService;
use App\Services\Translation\TranslationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class TranslateContentField implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /** @var list<int> */
    protected array $backoffSchedule = [60, 300, 900];

    public function __construct(
        public int $contentTranslationId,
        public string $sourceText,
    ) {}

    public function tries(): int
    {
        return 3;
    }

    /**
     * @return list<int>
     */
    public function backoff(): array
    {
        return $this->backoffSchedule;
    }

    public function handle(TranslationService $translationService, ContentTranslationService $contentTranslationService): void
    {
        $translation = ContentTranslation::query()->find($this->contentTranslationId);
        if (! $translation instanceof ContentTranslation) {
            return;
        }

        $targets = $contentTranslationService->targetLocales($translation->source_locale);
        if ($targets === []) {
            $contentTranslationService->markTranslated($translation, []);

            return;
        }

        $result = $translationService->translateToLocales(
            text: $this->sourceText,
            sourceLocale: $translation->source_locale,
            targetLocales: $targets,
        );

        Log::debug('[Translation] TranslateContentField result', [
            'content_translation_id' => $this->contentTranslationId,
            'source_locale' => $translation->source_locale,
            'target_locales' => $targets,
            'success' => $result['success'],
            'error' => $result['error'] ?? null,
        ]);

        if (! $result['success']) {
            $contentTranslationService->markFailed($translation, $result['error'] ?? 'Translation failed.');

            return;
        }

        Log::debug('[Translation] TranslateContentField translations', [
            'content_translation_id' => $this->contentTranslationId,
            'locales' => array_keys($result['translations']),
            'meta' => $result['meta'] ?? null,
        ]);

        $contentTranslationService->markTranslated(
            $translation,
            $result['translations'],
            is_array($result['meta'] ?? null) ? $result['meta'] : null,
        );
    }
}
