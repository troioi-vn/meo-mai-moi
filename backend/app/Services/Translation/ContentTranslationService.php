<?php

declare(strict_types=1);

namespace App\Services\Translation;

use App\Jobs\TranslateContentField;
use App\Models\ContentTranslation;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class ContentTranslationService
{
    /**
     * @return array{
     *     original: string,
     *     original_locale: string,
     *     viewer_locale: string,
     *     translated: ?string,
     *     status: string,
     *     is_translated: bool
     * }|null
     */
    public function present(Model $model, string $field, ?string $sourceLocale, ?string $text, string $viewerLocale): ?array
    {
        $text = is_string($text) ? trim($text) : '';
        if ($text === '') {
            return null;
        }

        $sourceLocale = $this->normalizeLocale($sourceLocale);
        $viewerLocale = $this->normalizeLocale($viewerLocale);
        $sourceHash = $this->hash($text);

        $translation = ContentTranslation::query()
            ->where('translatable_type', $model->getMorphClass())
            ->where('translatable_id', $model->getKey())
            ->where('field', $field)
            ->first();

        if ($viewerLocale !== $sourceLocale) {
            $this->ensureTranslationRequested($model, $field, $sourceLocale, $sourceHash, $text, $translation);
            $translation?->refresh();
        }

        $translated = null;
        if (
            $viewerLocale !== $sourceLocale
            && $translation instanceof ContentTranslation
            && $translation->source_hash === $sourceHash
            && $translation->status === ContentTranslation::STATUS_TRANSLATED
        ) {
            $candidate = $translation->getTranslation('text', $viewerLocale, false);
            $translated = is_string($candidate) && trim($candidate) !== '' ? $candidate : null;
        }

        $status = $viewerLocale === $sourceLocale
            ? 'original'
            : ($translation instanceof ContentTranslation && $translation->source_hash === $sourceHash
                ? $translation->status
                : ContentTranslation::STATUS_PENDING);

        return [
            'original' => $text,
            'original_locale' => $sourceLocale,
            'viewer_locale' => $viewerLocale,
            'translated' => $translated,
            'status' => $translated !== null ? ContentTranslation::STATUS_TRANSLATED : $status,
            'is_translated' => $translated !== null,
        ];
    }

    /**
     * @param  array<string, string>  $translations
     */
    public function markTranslated(ContentTranslation $translation, array $translations): void
    {
        $translation->setTranslations('text', $translations);
        $translation->status = ContentTranslation::STATUS_TRANSLATED;
        $translation->error = null;
        $translation->translated_at = now();
        $translation->save();
    }

    public function markFailed(ContentTranslation $translation, string $error): void
    {
        $translation->update([
            'status' => ContentTranslation::STATUS_FAILED,
            'error' => mb_substr($error, 0, 4000),
        ]);
    }

    public function hash(string $text): string
    {
        return hash('sha256', $text);
    }

    /**
     * @return list<string>
     */
    public function targetLocales(string $sourceLocale): array
    {
        $sourceLocale = $this->normalizeLocale($sourceLocale);
        $supported = config('locales.supported', ['en']);
        if (! is_array($supported)) {
            $supported = ['en'];
        }

        return array_values(array_filter(
            $supported,
            fn (mixed $locale): bool => is_string($locale) && $locale !== '' && $locale !== $sourceLocale,
        ));
    }

    private function normalizeLocale(?string $locale): string
    {
        $locale = strtolower((string) $locale);
        $locale = explode('-', $locale)[0] ?: 'en';
        $supported = config('locales.supported', ['en']);

        return is_array($supported) && in_array($locale, $supported, true) ? $locale : 'en';
    }

    private function ensureTranslationRequested(
        Model $model,
        string $field,
        string $sourceLocale,
        string $sourceHash,
        string $text,
        ?ContentTranslation $existing,
    ): void {
        if (
            $existing instanceof ContentTranslation
            && $existing->source_hash === $sourceHash
            && in_array($existing->status, [ContentTranslation::STATUS_PENDING, ContentTranslation::STATUS_TRANSLATED], true)
        ) {
            return;
        }

        $translation = DB::transaction(function () use ($model, $field, $sourceLocale, $sourceHash): ContentTranslation {
            /** @var ContentTranslation $translation */
            $translation = ContentTranslation::query()->updateOrCreate(
                [
                    'translatable_type' => $model->getMorphClass(),
                    'translatable_id' => $model->getKey(),
                    'field' => $field,
                ],
                [
                    'source_locale' => $sourceLocale,
                    'source_hash' => $sourceHash,
                    'text' => [],
                    'status' => ContentTranslation::STATUS_PENDING,
                    'error' => null,
                    'translated_at' => null,
                ],
            );

            return $translation;
        });

        TranslateContentField::dispatch($translation->id, $text);
    }
}
