<?php

namespace App\Mail;

class HelperResponseAcceptedMail extends NotificationMail
{
    /**
     * Get the email template path.
     */
    protected function getTemplate(): string
    {
        return 'emails.notifications.helper-response-accepted';
    }

    /**
     * Get the email subject line.
     */
    protected function getSubject(): string
    {
        $petName = 'a pet';
        if (isset($this->data['pet_id'])) {
            $pet = \App\Models\Pet::find($this->data['pet_id']);
            if ($pet) {
                $petName = $pet->name;
            }
        }

        return "Great news! Your response for {$petName} has been accepted";
    }
}
