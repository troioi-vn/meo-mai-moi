<?php

namespace App\Mail;

use App\Enums\NotificationType;

class PlacementRequestAcceptedMail extends NotificationMail
{
    /**
     * Get the email template path.
     */
    protected function getTemplate(): string
    {
        return 'emails.notifications.placement-request-accepted';
    }

    /**
     * Get the email subject line.
     */
    protected function getSubject(): string
    {
        $catName = 'your cat';
        if (isset($this->data['cat_id'])) {
            $cat = \App\Models\Cat::find($this->data['cat_id']);
            if ($cat) {
                $catName = $cat->name;
            }
        }
        
        return "Your placement request for {$catName} has been accepted!";
    }
}