<?php

namespace App\Mail;

use App\Enums\NotificationType;

class PlacementRequestResponseMail extends NotificationMail
{
    /**
     * Get the email template path.
     */
    protected function getTemplate(): string
    {
        return 'emails.notifications.placement-request-response';
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
        
        return "New response to your placement request for {$catName}";
    }
}