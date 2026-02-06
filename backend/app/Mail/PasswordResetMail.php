<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use SerializesModels;

    private User $user;

    private string $token;

    private string $resetUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(User $user, string $token)
    {
        $this->user = $user;
        $this->token = $token;

        // Build the reset URL using the backend web route that redirects to frontend
        $backendUrl = config('app.url', 'http://localhost:8000');
        $this->resetUrl = $backendUrl.'/reset-password/'.$token.'?email='.urlencode($user->email);

        // Set locale for the mailable based on user preference
        $localeResolver = app(\App\Services\Notifications\NotificationLocaleResolver::class);
        $this->locale($localeResolver->resolve($this->user));
    }

    /**
     * Get the user.
     */
    public function getUser(): User
    {
        return $this->user;
    }

    /**
     * Get the token.
     */
    public function getToken(): string
    {
        return $this->token;
    }

    /**
     * Get the reset URL.
     */
    public function getResetUrl(): string
    {
        return $this->resetUrl;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            to: [$this->user->email],
            subject: __('messages.emails.subjects.password_reset', ['app' => config('app.name')]),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.password-reset',
            with: [
                'user' => $this->user,
                'resetUrl' => $this->resetUrl,
                'token' => $this->token,
                'expireMinutes' => config('auth.passwords.users.expire', 60),
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
}
