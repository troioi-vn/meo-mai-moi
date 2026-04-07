<?php

declare(strict_types=1);

namespace App\Mail;

class HabitReminderMail extends NotificationMail
{
    protected function getTemplate(): string
    {
        return 'emails.notifications.habit-reminder';
    }

    protected function getSubject(): string
    {
        return __('messages.emails.subjects.habit_reminder', [
            'habit' => $this->data['habit_name'] ?? __('messages.habits.default_name'),
        ]);
    }
}
