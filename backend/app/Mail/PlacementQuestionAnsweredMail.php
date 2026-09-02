<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\PlacementQuestion;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * The single email an asker receives, and only if they confirmed their address.
 * There is no ongoing subscription to leave, so there is nothing to unsubscribe
 * from - this fires once per question and never again.
 */
class PlacementQuestionAnsweredMail extends Mailable
{
    use SerializesModels;

    public function __construct(
        private readonly PlacementQuestion $question,
        private readonly string $listingUrl,
        private readonly string $petName,
    ) {
        $this->locale($this->question->question_locale ?: config('app.locale'));
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('messages.emails.subjects.placement_question_answered', [
                'pet' => $this->petName,
            ]),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.placement-question-answered',
            with: [
                'askerName' => $this->question->asker_name,
                'question' => $this->question->question,
                'answer' => $this->question->answer,
                'petName' => $this->petName,
                'listingUrl' => $this->listingUrl,
            ],
        );
    }
}
