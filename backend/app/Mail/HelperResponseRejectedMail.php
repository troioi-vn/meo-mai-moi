<?php

namespace App\Mail;

class HelperResponseRejectedMail extends NotificationMail
{
    /**
     * Get the email template path.
     */
    protected function getTemplate(): string
    {
        return 'emails.notifications.helper-response-rejected';
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

        return "Update on your response for {$petName}";
    }
}
