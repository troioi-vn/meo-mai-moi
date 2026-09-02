<?php

declare(strict_types=1);

namespace App\Services\Placement;

use App\Enums\PlacementQuestionStatus;
use App\Models\PlacementQuestion;
use App\Services\Translation\ContentTranslationService;

/**
 * Decides which public Q&A gets machine translated, and says so out loud.
 *
 * Two rules the plain ContentTranslationService does not know about:
 *
 * 1. Only published pairs are translated. An unanswered question costs nothing,
 *    which means a proof-of-work solver cannot spend the translation budget -
 *    only a human answering can.
 * 2. A pet gets a fixed number of translated pairs. Past that the pair renders
 *    in its original language with an on-demand control, rather than silently
 *    looking broken to a reader who cannot read it.
 *
 * Everything it emits is flagged unreviewed, because the person who approved
 * the pair only ever read one of the four languages it publishes in.
 */
class PlacementQuestionTranslator
{
    public function __construct(
        private readonly ContentTranslationService $translations,
    ) {}

    /**
     * @return array{
     *     question: array<string, mixed>|null,
     *     answer: array<string, mixed>|null,
     *     within_budget: bool,
     *     machine_translated: bool
     * }
     */
    public function present(PlacementQuestion $question, string $viewerLocale, bool $force = false): array
    {
        $withinBudget = $force || $this->isWithinBudget($question);

        if (! $question->isPublic() || ! $withinBudget) {
            return [
                'question' => null,
                'answer' => null,
                'within_budget' => $withinBudget,
                'machine_translated' => false,
            ];
        }

        $questionTranslation = $this->translations->present(
            model: $question,
            field: 'question',
            sourceLocale: $question->question_locale,
            text: $question->question,
            viewerLocale: $viewerLocale,
        );

        $answerTranslation = $this->translations->present(
            model: $question,
            field: 'answer',
            sourceLocale: $question->answer_locale,
            text: $question->answer,
            viewerLocale: $viewerLocale,
        );

        return [
            'question' => $questionTranslation,
            'answer' => $answerTranslation,
            // Never reviewed by the person who approved the pair, so the UI has
            // to say so wherever it renders one of these.
            'machine_translated' => ($questionTranslation['is_translated'] ?? false)
                || ($answerTranslation['is_translated'] ?? false),
            'within_budget' => true,
        ];
    }

    /**
     * A pair is inside the budget when fewer than the configured number of the
     * pet's questions were published before it. Ordering by publication rather
     * than by id keeps the budget stable when an owner unhides an old question.
     */
    public function isWithinBudget(PlacementQuestion $question): bool
    {
        $cap = (int) config('placement_questions.translated_pairs_per_pet', 20);

        if ($cap <= 0) {
            return false;
        }

        if ($question->published_at === null) {
            return false;
        }

        $publishedEarlier = PlacementQuestion::query()
            ->where('pet_id', $question->pet_id)
            ->where('status', PlacementQuestionStatus::PUBLISHED)
            ->whereNotNull('published_at')
            ->where(function ($query) use ($question): void {
                $query->where('published_at', '<', $question->published_at)
                    ->orWhere(function ($tie) use ($question): void {
                        $tie->where('published_at', '=', $question->published_at)
                            ->where('id', '<', $question->id);
                    });
            })
            ->count();

        return $publishedEarlier < $cap;
    }
}
