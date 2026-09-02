<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Mail\PlacementQuestionConfirmationMail;
use App\Models\PlacementQuestion;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

class SendPlacementQuestionConfirmationEmail implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        public int $questionId,
        public string $token,
    ) {}

    public function handle(): void
    {
        $question = PlacementQuestion::query()->with('pet')->find($this->questionId);

        if ($question === null || $question->asker_email === null || $question->asker_email_confirmed_at !== null) {
            return;
        }

        $url = URL::to('/placement-questions/'.$question->id.'/confirm?'.http_build_query([
            'token' => $this->token,
        ]));

        Mail::to($question->asker_email)->send(new PlacementQuestionConfirmationMail(
            $question,
            $url,
            (string) $question->pet->name,
        ));
    }
}
