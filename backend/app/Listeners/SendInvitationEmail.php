<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\InvitationEmailRequested;
use App\Notifications\InvitationToEmail;
use Illuminate\Support\Facades\Log;

class SendInvitationEmail
{
    public function handle(InvitationEmailRequested $event): void
    {
        try {
            InvitationToEmail::sendToEmail(
                $event->email,
                $event->invitation,
                $event->inviter,
                $event->locale,
            );
        } catch (\Exception $exception) {
            Log::warning('Failed to send invitation email', [
                'invitation_id' => $event->invitation->id,
                'email' => $event->email,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}