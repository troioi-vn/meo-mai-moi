<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\PlacementQuestion;
use App\Models\User;
use App\Services\Placement\PlacementQuestionTranslator;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property PlacementQuestion $resource
 */
class PlacementQuestionResource extends JsonResource
{
    /**
     * The asker's address and IP are never exposed to anybody through the API,
     * including the owner. The owner gets a name and a question; the address
     * exists only so the app can mail one answer back.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User|null $user */
        $user = $request->user();

        // A listing resolves this once for the whole collection and stamps it,
        // because asking the policy per row reloads the pet per row.
        $stamped = $this->resource->getAttribute('viewer_can_moderate');
        $canModerate = is_bool($stamped)
            ? $stamped
            : ($user !== null && $user->can('moderate', $this->resource));

        $translation = $this->resource->getAttribute('question_translation');

        $data = [
            'id' => $this->resource->id,
            'pet_id' => $this->resource->pet_id,
            'placement_request_id' => $this->resource->placement_request_id,
            'asker_name' => $this->resource->asker_name,
            'question' => $this->resource->question,
            'question_locale' => $this->resource->question_locale,
            'answer' => $this->resource->answer,
            'answer_locale' => $this->resource->answer_locale,
            'answered_by_name' => $this->resource->answered_by_name,
            'answered_at' => $this->resource->answered_at,
            'published_at' => $this->resource->published_at,
            'created_at' => $this->resource->created_at,
            'is_answered' => $this->resource->isAnswered(),
            'status' => $this->resource->status->value,
        ];

        if (is_array($translation)) {
            $data['question_translation'] = $translation['question'];
            $data['answer_translation'] = $translation['answer'];
            // Whoever approved this pair could read exactly one of the four
            // languages it publishes in, so the UI has to say the rest are
            // machine output nobody reviewed.
            $data['machine_translated'] = $translation['machine_translated'];
            $data['translation_within_budget'] = $translation['within_budget'];
        }

        if ($canModerate) {
            $data['asker_email_confirmed'] = $this->resource->asker_email_confirmed_at !== null;
            $data['hidden_at'] = $this->resource->hidden_at;
        }

        return $data;
    }

    /**
     * Attach the translated view of a collection in one pass, so a listing does
     * not resolve the translator once per row.
     *
     * @param  iterable<int, PlacementQuestion>  $questions
     */
    public static function withTranslations(
        iterable $questions,
        PlacementQuestionTranslator $translator,
        string $viewerLocale,
        bool $canModerate,
    ): void {
        foreach ($questions as $question) {
            $question->setAttribute(
                'question_translation',
                $translator->present($question, $viewerLocale),
            );
            $question->setAttribute('viewer_can_moderate', $canModerate);
        }
    }
}
