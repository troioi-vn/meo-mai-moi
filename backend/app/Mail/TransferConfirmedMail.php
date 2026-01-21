<?php

declare(strict_types=1);

namespace App\Mail;

class TransferConfirmedMail extends NotificationMail
{
    /**
     * Get the email template path.
     */
    protected function getTemplate(): string
    {
        return 'emails.notifications.transfer-confirmed';
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

        return "Handover confirmed for {$petName}";
    }
}
