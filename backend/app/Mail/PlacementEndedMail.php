<?php

namespace App\Mail;

class PlacementEndedMail extends NotificationMail
{
    /**
     * Get the email template path.
     */
    protected function getTemplate(): string
    {
        return 'emails.notifications.placement-ended';
    }

    /**
     * Get the email subject line.
     */
    protected function getSubject(): string
    {
        $petName = 'a pet';
        if (isset($this->data['pet_name'])) {
            $petName = $this->data['pet_name'];
        } elseif (isset($this->data['pet_id'])) {
            $pet = \App\Models\Pet::find($this->data['pet_id']);
            if ($pet instanceof \App\Models\Pet) {
                $petName = $pet->name;
            }
        }

        return "Your placement for {$petName} has ended";
    }
}
