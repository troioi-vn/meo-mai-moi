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
        $petName = null;
        if (isset($this->data['pet_id'])) {
            $pet = Pet::find($this->data['pet_id']);
            if ($pet) {
                /** @var Pet $pet */
                $petName = $pet->name;
            }
        }

        $age = $this->data['age'] ?? null;
        $subjectKey = 'messages.emails.subjects.pet_birthday'
            .($petName === null ? '_without_pet' : '')
            .($age ? '_with_age' : '');

        return __($subjectKey, [
            'pet' => $petName,
            'age' => $age ? trans_choice('messages.emails.common.years_old', $age) : '',
        ]);
    }
}
