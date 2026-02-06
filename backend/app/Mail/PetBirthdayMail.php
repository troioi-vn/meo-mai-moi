<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Pet;

class PetBirthdayMail extends NotificationMail
{
    protected function getTemplate(): string
    {
        return 'emails.notifications.pet-birthday';
    }

    protected function getSubject(): string
    {
        $petName = __('messages.emails.common.your_pet');
        if (isset($this->data['pet_id'])) {
            $pet = Pet::find($this->data['pet_id']);
            if ($pet) {
                /** @var \App\Models\Pet $pet */
                $petName = $pet->name;
            }
        }

        $age = $this->data['age'] ?? '';
        $ageStr = $age ? " ({$age})" : '';

        return __('messages.emails.subjects.pet_birthday', [
            'pet' => $petName,
            'age' => $ageStr,
        ]);
    }
}
