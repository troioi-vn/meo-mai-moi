<?php

namespace App\Mail;

use App\Enums\NotificationType;

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
        $catName = 'a cat';
        if (isset($this->data['cat_id'])) {
            $cat = \App\Models\Cat::find($this->data['cat_id']);
            if ($cat) {
                $catName = $cat->name;
            }
        }
        
        return "Great news! Your response for {$catName} has been accepted";
    }
}