<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\WaitlistEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Mail;

class WaitlistConfirmation extends Notification implements ShouldQueue
{
    use Queueable;

    private WaitlistEntry $waitlistEntry;

    /**
     * Create a new notification instance.
     */
    public function __construct(WaitlistEntry $waitlistEntry)
    {
        $this->waitlistEntry = $waitlistEntry;
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
    public function toMail(object $notifiable): MailMessage
    {
        $appName = config('app.name', 'Our Platform');

        return (new MailMessage)
            ->subject("You're on the waitlist for {$appName}!")
            ->markdown('emails.waitlist-confirmation', [
                'waitlistEntry' => $this->waitlistEntry,
            ]);
    }

    /**
     * Send waitlist confirmation directly to email address
     */
    public static function sendToEmail(string $email, WaitlistEntry $waitlistEntry): void
    {
        $appName = config('app.name', 'Our Platform');

        Mail::send('emails.waitlist-confirmation', [
            'waitlistEntry' => $waitlistEntry,
        ], function ($message) use ($email, $appName): void {
            $message->to($email)
                ->subject("You're on the waitlist for {$appName}!");
        });
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'waitlist_entry_id' => $this->waitlistEntry->id,
            'email' => $this->waitlistEntry->email,
            'status' => $this->waitlistEntry->status,
        ];
    }
}
