<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Pet;

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
        $petName = null;
        if (isset($this->data['pet_name'])) {
            $petName = $this->data['pet_name'];
        } elseif (isset($this->data['pet_id'])) {
            $pet = Pet::find($this->data['pet_id']);
            if ($pet instanceof Pet) {
                $petName = $pet->name;
            }
        }

        return __('messages.emails.subjects.placement_ended'.($petName === null ? '_without_pet' : ''), ['pet' => $petName]);
    }
}
