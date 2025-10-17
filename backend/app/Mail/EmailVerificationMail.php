<?php

namespace App\Mail;

use App\Enums\NotificationType;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class EmailVerificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public string $verificationUrl;

    public string $appName;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public User $user,
        public NotificationType $notificationType,
        public array $data
    ) {
        $this->verificationUrl = $this->generateVerificationUrl($user);
        $this->appName = config('app.name');
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Verify Your Email Address - '.$this->appName,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.email-verification',
            with: [
                'user' => $this->user,
                'verificationUrl' => $this->verificationUrl,
                'appName' => $this->appName,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }

    /**
     * Generate the verification URL for the user.
     */
    private function generateVerificationUrl(User $user): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(Config::get('auth.verification.expire', 60)),
            [
                'id' => $user->getKey(),
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );
    }
}
