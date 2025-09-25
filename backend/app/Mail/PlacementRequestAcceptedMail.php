<?php

namespace App\Mail;

use App\Enums\NotificationType;

class PlacementRequestAcceptedMail extends NotificationMail
{
    /**
     * Get the email template path.
     */
    protected function getTemplate(): string
    {
        return 'emails.notifications.placement-request-accepted';
    }

    /**
     * Get the email subject line.
     */
    protected function getSubject(): string
    {
        $petName = 'your pet';
        if (isset($this->data['pet_id'])) {
            $pet = \App\Models\Pet::find($this->data['pet_id']);
            if ($pet) {
                $petName = $pet->name;
            }
        }

        return "Your placement request for {$petName} has been accepted!";
    }
}