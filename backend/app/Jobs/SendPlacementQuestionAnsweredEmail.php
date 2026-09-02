<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Mail\PlacementQuestionAnsweredMail;
use App\Models\PlacementQuestion;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendPlacementQuestionAnsweredEmail implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        public int $questionId,
    ) {}

    public function handle(): void
    {
        $question = PlacementQuestion::query()->with('pet')->find($this->questionId);

        // Re-checked at send time rather than at dispatch: the owner may have
        // hidden the thread again, or the address may have lapsed unconfirmed,
        // between queueing this and running it.
        if (
            $question === null
            || ! $question->wantsAnswerNotification()
            || ! $question->isPublic()
            || ! $question->isAnswered()
        ) {
            return;
        }

        $listingUrl = $question->placement_request_id === null
            ? frontend_url().'/pets/'.$question->pet_id
            : frontend_url().'/placement-requests/'.$question->placement_request_id;

        Mail::to($question->asker_email)->send(new PlacementQuestionAnsweredMail(
            $question,
            $listingUrl,
            (string) $question->pet->name,
        ));
    }
}
