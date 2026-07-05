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

        if (! $result['success']) {
            $contentTranslationService->markFailed($translation, $result['error'] ?? 'Translation failed.');

            return;
        }

        $contentTranslationService->markTranslated($translation, $result['translations']);
    }
}
