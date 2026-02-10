<?php

declare(strict_types=1);

namespace App\Mail;

class ChatDigestMail extends NotificationMail
{
    /**
     * Get the email template path.
     */
    protected function getTemplate(): string
    {
        return 'emails.notifications.chat-digest';
    }

    /**
     * Get the email subject line.
     */
    protected function getSubject(): string
    {
        $count = $this->data['total_messages'] ?? 0;

        return __('messages.emails.subjects.chat_digest', ['count' => $count]);
    }
}
