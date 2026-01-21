<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\NotificationType;
use Illuminate\Auth\Notifications\VerifyEmail as BaseVerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class VerifyEmail extends BaseVerifyEmail implements ShouldQueue
{
    use Queueable;

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        // Use our custom notification channel that integrates with our email system
        return ['notification_email'];
    }

    /**
     * Route notification for our custom notification email channel.
     */
    public function toNotificationEmail($notifiable)
    {
        $verificationUrl = $this->verificationUrl($notifiable);

        return [
            'type' => NotificationType::EMAIL_VERIFICATION->value,
            'data' => [
                'user' => $notifiable, // This will be used by the email job
                'verificationUrl' => $verificationUrl,
                'appName' => config('app.name'),
                'message' => 'Please verify your email address to complete your registration.',
            ],
        ];
    }

    /**
     * Get the mail representation of the notification (fallback).
     */
    public function toMail($notifiable): MailMessage
    {
        $verificationUrl = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('Verify Your Email Address - '.config('app.name'))
            ->markdown('emails.email-verification', [
                'user' => $notifiable,
                'verificationUrl' => $verificationUrl,
                'appName' => config('app.name'),
            ]);
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        return [
            'type' => NotificationType::EMAIL_VERIFICATION->value,
            'message' => 'Please verify your email address to complete your registration.',
            'verification_url' => $this->verificationUrl($notifiable),
        ];
    }

    /**
     * Get the verification URL for the given notifiable.
     */
    protected function verificationUrl($notifiable): string
    {
        // Use Laravel's URL::temporarySignedRoute to create a proper signed URL
        // Use the web route for email links (redirects to frontend after verification)
        return URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes(Config::get('auth.verification.expire', 60)),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );
    }
}
