<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\PlacementQuestion;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to someone who is not a user of this app, so it carries no unsubscribe
 * link: confirming is the opt-in, and ignoring this email is the opt-out. The
 * address is deleted if this is never clicked.
 */
class PlacementQuestionConfirmationMail extends Mailable
{
    use SerializesModels;

    public function __construct(
        private readonly PlacementQuestion $question,
        private readonly string $confirmationUrl,
        private readonly string $petName,
    ) {
        $this->locale($this->question->question_locale ?: config('app.locale'));
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('messages.emails.subjects.placement_question_confirmation', [
                'pet' => $this->petName,
            ]),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.placement-question-confirmation',
            with: [
                'askerName' => $this->question->asker_name,
                'question' => $this->question->question,
                'petName' => $this->petName,
                'confirmationUrl' => $this->confirmationUrl,
            ],
        );
    }
}
