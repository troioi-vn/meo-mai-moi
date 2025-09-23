<?php

namespace App\Notifications;

use App\Mail\PasswordResetMail;
use App\Models\EmailLog;
use App\Services\EmailConfigurationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class CustomPasswordReset extends Notification
{
    // Removed Queueable trait and ShouldQueue interface to process synchronously

    public string $token;

    /**
     * Create a new notification instance.
     */
    public function __construct(string $token)
    {
        $this->token = $token;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): PasswordResetMail
    {
        // Create EmailLog entry for admin tracking (following your system's pattern)
        $this->createEmailLogEntry($notifiable);
        
        return new PasswordResetMail($notifiable, $this->token);
    }

    /**
     * Create EmailLog entry following the existing system pattern.
     */
    protected function createEmailLogEntry(object $notifiable): void
    {
        try {
            // Get active email configuration or fall back to default
            $emailService = app(EmailConfigurationService::class);
            $activeConfig = $emailService->getActiveConfiguration();
            $configId = $activeConfig ? $activeConfig->id : 1;

            $frontendUrl = config('app.frontend_url', 'http://localhost:8000');
            $resetUrl = $frontendUrl . '/reset-password?token=' . $this->token . '&email=' . urlencode($notifiable->email);

            // Create email body using the template
            $emailBody = view('emails.password-reset', [
                'user' => $notifiable,
                'resetUrl' => $resetUrl,
                'token' => $this->token,
            ])->render();

            // Create EmailLog entry for admin panel viewing
            EmailLog::create([
                'user_id' => $notifiable->id,
                'email_configuration_id' => $configId,
                'recipient_email' => $notifiable->email,
                'subject' => 'Password Reset - ' . config('app.name'),
                'body' => $emailBody,
                'status' => 'pending', // Will be updated when email is actually sent
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to create password reset EmailLog entry', [
                'user_id' => $notifiable->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'token' => $this->token,
            'email' => $notifiable->email,
        ];
    }
}
