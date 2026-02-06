<?php

declare(strict_types=1);

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
        $petName = __('messages.emails.common.a_pet');
        if (isset($this->data['pet_name'])) {
            $petName = $this->data['pet_name'];
        } elseif (isset($this->data['pet_id'])) {
            $pet = \App\Models\Pet::find($this->data['pet_id']);
            if ($pet instanceof \App\Models\Pet) {
                $petName = $pet->name;
            }
        }

        return __('messages.emails.subjects.placement_ended', ['pet' => $petName]);
    }
}
