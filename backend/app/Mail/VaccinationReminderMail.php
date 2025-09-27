<?php

namespace App\Mail;

use App\Enums\NotificationType;
use App\Models\Pet;
use App\Models\VaccinationRecord;

class VaccinationReminderMail extends NotificationMail
{
    protected function getTemplate(): string
    {
        return 'emails.notifications.vaccination-reminder';
    }

    protected function getSubject(): string
    {
        $petName = 'your pet';
        if (isset($this->data['pet_id'])) {
            $pet = Pet::find($this->data['pet_id']);
            if ($pet) {
                $petName = $pet->name;
            }
        }

        $vaccine = $this->data['vaccine_name'] ?? 'a vaccine';
        $dueStr = isset($this->data['due_at']) ? (string) $this->data['due_at'] : 'soon';

        return "Reminder: {$petName} is due for {$vaccine} {$dueStr}";
    }
}
