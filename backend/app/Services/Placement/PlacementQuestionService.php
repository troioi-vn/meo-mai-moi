<?php

declare(strict_types=1);

namespace App\Services\Placement;

use App\Enums\NotificationType;
use App\Enums\PlacementQuestionStatus;
use App\Enums\PlacementRequestStatus;
use App\Exceptions\PlacementQuestionException;
use App\Jobs\SendPlacementQuestionAnsweredEmail;
use App\Jobs\SendPlacementQuestionConfirmationEmail;
use App\Models\Pet;
use App\Models\PlacementQuestion;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * The lifecycle of a public question.
 *
 *   pending ──answer/approve──> published <──unhide──> hidden
 *      └────────────hide───────────────────────────────┘
 *
 * Email confirmation runs alongside and never touches those transitions: it
 * decides whether the asker hears back, not whether anyone else can read them.
 */
class PlacementQuestionService
{
    public function __construct(
        private readonly PlacementNotifier $notifier,
    ) {}

    /**
     * @param  array{asker_name: string, asker_email?: string|null, question: string}  $data
     *
     * @throws PlacementQuestionException
     */
    public function ask(PlacementRequest $placementRequest, array $data, ?string $ip, string $locale): PlacementQuestion
    {
        if ($placementRequest->status !== PlacementRequestStatus::OPEN) {
            throw PlacementQuestionException::listingNotOpen();
        }

        $this->guardPendingQueue($placementRequest);

        $email = isset($data['asker_email']) && is_string($data['asker_email']) && trim($data['asker_email']) !== ''
            ? mb_strtolower(trim($data['asker_email']))
            : null;

        $token = $email === null ? null : Str::random(64);
        $ttlHours = (int) config('placement_questions.email_confirmation_ttl_hours', 48);

        $question = DB::transaction(fn (): PlacementQuestion => PlacementQuestion::create([
            'pet_id' => $placementRequest->pet_id,
            'placement_request_id' => $placementRequest->id,
            'asker_name' => trim($data['asker_name']),
            'asker_email' => $email,
            'email_confirmation_token_hash' => $token === null ? null : hash('sha256', $token),
            'email_confirmation_expires_at' => $token === null ? null : now()->addHours($ttlHours),
            'asker_ip' => $ip,
            'question' => trim($data['question']),
            'question_locale' => $locale,
            'status' => PlacementQuestionStatus::PENDING,
        ]));

        if ($token !== null) {
            SendPlacementQuestionConfirmationEmail::dispatch($question->id, $token);
        }

        $this->notifier->notifyOwnerSideInApp(
            $placementRequest,
            NotificationType::PLACEMENT_QUESTION_RECEIVED->value,
            [
                'message' => __('messages.placement_questions.notifications.received', [
                    'name' => $question->asker_name,
                    'pet' => (string) $placementRequest->pet->name,
                ]),
                'link' => "/requests/{$placementRequest->id}#questions",
                'placement_question_id' => $question->id,
                'placement_request_id' => $placementRequest->id,
                'pet_id' => $placementRequest->pet_id,
            ],
        );

        return $question;
    }

    /**
     * Confirmation only ever unlocks delivery. A question that is already
     * published stays published; one still pending stays pending.
     *
     * @throws PlacementQuestionException
     */
    public function confirmEmail(PlacementQuestion $question, string $token): PlacementQuestion
    {
        $hash = $question->email_confirmation_token_hash;

        if (
            $hash === null
            || $question->asker_email === null
            || $question->email_confirmation_expires_at === null
            || $question->email_confirmation_expires_at->isPast()
            || ! hash_equals($hash, hash('sha256', $token))
        ) {
            throw PlacementQuestionException::invalidConfirmationToken();
        }

        $question->forceFill([
            'asker_email_confirmed_at' => now(),
            'email_confirmation_token_hash' => null,
            'email_confirmation_expires_at' => null,
        ])->save();

        // Confirming after the owner already answered still earns the answer.
        if ($question->isPublic() && $question->isAnswered()) {
            SendPlacementQuestionAnsweredEmail::dispatch($question->id);
        }

        return $question;
    }

    /**
     * Answering publishes. This is the only path that turns anonymous text into
     * something a logged-out visitor can read.
     */
    public function answer(PlacementQuestion $question, string $answer, User $user, string $locale): PlacementQuestion
    {
        $alreadyAnswered = $question->isAnswered();

        $question->forceFill([
            'answer' => trim($answer),
            'answer_locale' => $locale,
            'answered_by_user_id' => $user->id,
            'answered_by_name' => $user->name,
            'answered_at' => $question->answered_at ?? now(),
            'status' => PlacementQuestionStatus::PUBLISHED,
            'published_at' => $question->published_at ?? now(),
            'hidden_at' => null,
        ])->save();

        // Editing an answer does not re-notify: the asker already heard once,
        // and a correction is not a new event to them.
        if (! $alreadyAnswered && $question->wantsAnswerNotification()) {
            SendPlacementQuestionAnsweredEmail::dispatch($question->id);
        }

        return $question;
    }

    /**
     * Publish a question without answering it - useful when the answer is
     * already visible elsewhere on the listing and the owner just wants the
     * question to stop being asked.
     *
     * @throws PlacementQuestionException
     */
    public function approve(PlacementQuestion $question): PlacementQuestion
    {
        if ($question->status === PlacementQuestionStatus::PUBLISHED) {
            throw PlacementQuestionException::alreadyPublished();
        }

        $question->forceFill([
            'status' => PlacementQuestionStatus::PUBLISHED,
            'published_at' => $question->published_at ?? now(),
            'hidden_at' => null,
        ])->save();

        return $question;
    }

    public function hide(PlacementQuestion $question): PlacementQuestion
    {
        $question->forceFill([
            'status' => PlacementQuestionStatus::HIDDEN,
            'hidden_at' => now(),
        ])->save();

        return $question;
    }

    /**
     * Unhiding restores whichever state the question came from: back to public
     * if it had been answered or approved, back to the queue if it never was.
     */
    public function unhide(PlacementQuestion $question): PlacementQuestion
    {
        $wasPublished = $question->published_at !== null;

        $question->forceFill([
            'status' => $wasPublished ? PlacementQuestionStatus::PUBLISHED : PlacementQuestionStatus::PENDING,
            'hidden_at' => null,
        ])->save();

        return $question;
    }

    /**
     * Ownership transfer keeps the answers and drops the previous owner's name.
     *
     * The text stays because a new owner inheriting a pet also inherits the
     * questions people already asked about it. The name goes because the person
     * who wrote those answers can no longer correct or withdraw them.
     */
    /**
     * @param  list<int>  $formerOwnerIds
     */
    public function anonymizePreviousOwnerAnswers(Pet $pet, array $formerOwnerIds): int
    {
        if ($formerOwnerIds === []) {
            return 0;
        }

        return PlacementQuestion::query()
            ->where('pet_id', $pet->id)
            ->whereIn('answered_by_user_id', $formerOwnerIds)
            ->update([
                'answered_by_user_id' => null,
                'answered_by_name' => null,
            ]);
    }

    /**
     * An address nobody confirmed will never be mailed and cannot be managed by
     * the person it belongs to, so keeping it past the window serves no one.
     */
    public function discardUnconfirmedEmails(): int
    {
        return PlacementQuestion::query()
            ->whereNull('asker_email_confirmed_at')
            ->whereNotNull('email_confirmation_expires_at')
            ->where('email_confirmation_expires_at', '<', now())
            ->update([
                'asker_email' => null,
                'email_confirmation_token_hash' => null,
                'email_confirmation_expires_at' => null,
            ]);
    }

    /**
     * Erase one person's identity from every question they asked, keeping the
     * threads intact. This is the path behind "email us and we will remove it".
     */
    public function forgetAsker(string $email): int
    {
        return PlacementQuestion::query()
            ->where('asker_email', mb_strtolower(trim($email)))
            ->update([
                'asker_name' => __('messages.placement_questions.anonymous_asker'),
                'asker_email' => null,
                'asker_email_confirmed_at' => null,
                'email_confirmation_token_hash' => null,
                'email_confirmation_expires_at' => null,
                'asker_ip' => null,
            ]);
    }

    /**
     * @throws PlacementQuestionException
     */
    private function guardPendingQueue(PlacementRequest $placementRequest): void
    {
        $max = (int) config('placement_questions.max_pending_per_listing', 50);

        if ($max <= 0) {
            return;
        }

        $pending = PlacementQuestion::query()
            ->where('placement_request_id', $placementRequest->id)
            ->where('status', PlacementQuestionStatus::PENDING)
            ->count();

        if ($pending >= $max) {
            throw PlacementQuestionException::tooManyPendingQuestions();
        }
    }
}
