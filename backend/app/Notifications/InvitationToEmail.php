<?php

namespace App\Notifications;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Mail;

class InvitationToEmail extends Notification implements ShouldQueue
{
    use Queueable;

    private Invitation $invitation;
    private User $inviter;
    private string $email;

    /**
     * Create a new notification instance.
     */
    public function __construct(Invitation $invitation, User $inviter, string $email)
    {
        $this->invitation = $invitation;
        $this->inviter = $inviter;
        $this->email = $email;
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
        $invitationUrl = $this->invitation->getInvitationUrl();
        
        return (new MailMessage)
            ->to($this->email)
            ->subject("You're invited to join {$appName}!")
            ->markdown('emails.invitation', [
                'inviter' => $this->inviter,
                'invitation' => $this->invitation,
                'invitationUrl' => $invitationUrl,
            ]);
    }

    /**
     * Send invitation directly to email address
     */
    public static function sendToEmail(string $email, Invitation $invitation, User $inviter): void
    {
        $appName = config('app.name', 'Our Platform');
        $invitationUrl = $invitation->getInvitationUrl();

        Mail::send('emails.invitation', [
            'inviter' => $inviter,
            'invitation' => $invitation,
            'invitationUrl' => $invitationUrl,
        ], function ($message) use ($email, $appName) {
            $message->to($email)
                    ->subject("You're invited to join {$appName}!");
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
            'invitation_id' => $this->invitation->id,
            'invitation_code' => $this->invitation->code,
            'inviter_name' => $this->inviter->name,
            'inviter_id' => $this->inviter->id,
            'recipient_email' => $this->email,
        ];
    }
}
