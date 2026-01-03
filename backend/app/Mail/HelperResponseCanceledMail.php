<?php

namespace App\Mail;

class HelperResponseCanceledMail extends NotificationMail
{
    /**
     * Get the email template path.
     */
    protected function getTemplate(): string
    {
        return 'emails.notifications.helper-response-canceled';
    }

    /**
     * Get the email subject line.
     */
    protected function getSubject(): string
    {
        $petName = 'your pet';
        if (isset($this->data['pet_name'])) {
            $petName = $this->data['pet_name'];
        } elseif (isset($this->data['pet_id'])) {
            $pet = \App\Models\Pet::find($this->data['pet_id']);
            if ($pet instanceof \App\Models\Pet) {
                $petName = $pet->name;
            }
        }

        return "A helper withdrew their response for {$petName}";
    }
}
