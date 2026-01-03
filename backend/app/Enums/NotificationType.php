<?php

namespace App\Enums;

enum NotificationType: string
{
    // Owner receives: when someone responds to their placement request
    case PLACEMENT_REQUEST_RESPONSE = 'placement_request_response';

    // Helper receives: when owner accepts their response
    case HELPER_RESPONSE_ACCEPTED = 'helper_response_accepted';

    // Helper receives: when owner rejects their response (before or after acceptance)
    case HELPER_RESPONSE_REJECTED = 'helper_response_rejected';

    // Owner receives: when helper cancels their response or transfer
    case HELPER_RESPONSE_CANCELED = 'helper_response_canceled';

    // Owner receives: when helper confirms physical handover
    case TRANSFER_CONFIRMED = 'transfer_confirmed';

    // Helper receives: when owner marks pet as returned (placement ended)
    case PLACEMENT_ENDED = 'placement_ended';

    // Pet health reminders
    case VACCINATION_REMINDER = 'vaccination_reminder';
    case PET_BIRTHDAY = 'pet_birthday';

    // Account & messaging
    case EMAIL_VERIFICATION = 'email_verification';
    case NEW_MESSAGE = 'new_message';

    public function getGroup(): string
    {
        return match ($this) {
            // Owner-side placement notifications
            self::PLACEMENT_REQUEST_RESPONSE,
            self::HELPER_RESPONSE_CANCELED,
            self::TRANSFER_CONFIRMED => 'placement_owner',

            // Helper-side placement notifications
            self::HELPER_RESPONSE_ACCEPTED,
            self::HELPER_RESPONSE_REJECTED,
            self::PLACEMENT_ENDED => 'placement_helper',

            // Pet reminders
            self::VACCINATION_REMINDER,
            self::PET_BIRTHDAY => 'pet_reminders',

            // Account
            self::EMAIL_VERIFICATION => 'account',

            // Messaging
            self::NEW_MESSAGE => 'messaging',
        };
    }

    public function getGroupLabel(): string
    {
        return match ($this->getGroup()) {
            'placement_owner' => 'Your Placement Requests',
            'placement_helper' => 'Your Responses to Placements',
            'pet_reminders' => 'Pet Reminders',
            'account' => 'Account',
            'messaging' => 'Messaging',
            default => 'Other',
        };
    }

    public function getLabel(): string
    {
        return match ($this) {
            self::PLACEMENT_REQUEST_RESPONSE => 'New response to your request',
            self::HELPER_RESPONSE_ACCEPTED => 'Your response was accepted',
            self::HELPER_RESPONSE_REJECTED => 'Your response was declined',
            self::HELPER_RESPONSE_CANCELED => 'Helper withdrew their response',
            self::TRANSFER_CONFIRMED => 'Pet handover confirmed',
            self::PLACEMENT_ENDED => 'Placement has ended',
            self::VACCINATION_REMINDER => 'Vaccination due soon',
            self::PET_BIRTHDAY => 'Pet birthday',
            self::EMAIL_VERIFICATION => 'Email verification',
            self::NEW_MESSAGE => 'New message',
        };
    }

    public function getDescription(): string
    {
        return match ($this) {
            self::PLACEMENT_REQUEST_RESPONSE => 'When someone responds to your placement request',
            self::HELPER_RESPONSE_ACCEPTED => 'When a pet owner accepts your response',
            self::HELPER_RESPONSE_REJECTED => 'When a pet owner declines your response',
            self::HELPER_RESPONSE_CANCELED => 'When a helper withdraws their response',
            self::TRANSFER_CONFIRMED => 'When a helper confirms receiving a pet',
            self::PLACEMENT_ENDED => 'When a placement you participated in has ended',
            self::VACCINATION_REMINDER => 'Reminders when vaccinations are due',
            self::PET_BIRTHDAY => 'Notifications on your pet\'s birthday',
            self::EMAIL_VERIFICATION => 'Emails to verify your email address',
            self::NEW_MESSAGE => 'When you receive a new message',
        };
    }
}
