<?php

declare(strict_types=1);

namespace App\Mail;

class HelperResponseAcceptedMail extends NotificationMail
{
    /**
     * Get the email template path.
     */
    protected function getTemplate(): string
    {
        return 'emails.notifications.helper-response-accepted';
    }

    /**
     * Get the email subject line.
     */
    protected function getSubject(): string
    {
        $petName = __('messages.emails.common.a_pet');
        if (isset($this->data['pet_id'])) {
            $pet = \App\Models\Pet::find($this->data['pet_id']);
            if ($pet instanceof \App\Models\Pet) {
                $petName = $pet->name;
            }
        }

        return __('messages.emails.subjects.helper_response_accepted', ['pet' => $petName]);
    }
}
