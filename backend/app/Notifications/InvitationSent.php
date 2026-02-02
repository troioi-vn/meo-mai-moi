<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Invitation;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InvitationSent extends Notification implements ShouldQueue
{
    use Queueable;

    private Invitation $invitation;

    private User $inviter;

    /**
     * Create a new notification instance.
     */
    public function __construct(Invitation $invitation, User $inviter)
    {
        $this->invitation = $invitation;
        $this->inviter = $inviter;
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
        $this->locale = app(\App\Services\Notifications\NotificationLocaleResolver::class)->resolve($notifiable);

        return (new MailMessage)
            ->subject(__('messages.emails.subjects.invitation', ['app' => $appName], $this->locale))
            ->markdown('emails.invitation', [
                'inviter' => $this->inviter,
                'invitation' => $this->invitation,
                'invitationUrl' => $invitationUrl,
            ]);
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
        ];
    }
}
