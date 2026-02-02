<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Pet;

class VaccinationReminderMail extends NotificationMail
{
    protected function getTemplate(): string
    {
        return 'emails.notifications.vaccination-reminder';
    }

    protected function getSubject(): string
    {
        $petName = __('messages.emails.common.your_pet');
        if (isset($this->data['pet_id'])) {
            $pet = Pet::find($this->data['pet_id']);
            if ($pet instanceof Pet) {
                $petName = $pet->name;
            }
        }

        $vaccine = $this->data['vaccine_name'] ?? __('messages.emails.common.a_vaccine');
        $dueStr = isset($this->data['due_at']) ? (string) $this->data['due_at'] : __('messages.emails.common.soon');

        return __('messages.emails.subjects.vaccination_reminder', [
            'pet' => $petName,
            'vaccine' => $vaccine,
            'due' => $dueStr,
        ]);
    }
}
