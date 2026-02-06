<?php

declare(strict_types=1);

namespace App\Mail;

class NewMessageMail extends NotificationMail
{
    /**
     * Get the email template path.
     */
    protected function getTemplate(): string
    {
        return 'emails.notifications.new-message';
    }

    /**
     * Get the email subject line.
     */
    protected function getSubject(): string
    {
        $senderName = $this->data['sender_name'] ?? __('messages.emails.common.someone');

        return __('messages.emails.subjects.new_message', ['sender' => $senderName]);
    }
}
