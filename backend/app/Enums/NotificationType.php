<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum NotificationType: string implements HasColor, HasLabel
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
        return __("messages.notifications.groups.{$this->getGroup()}");
    }

    public function getLabel(): string
    {
        return __("messages.notifications.types.{$this->value}.label");
    }

    public function getColor(): string
    {
        return match ($this) {
            self::PLACEMENT_REQUEST_RESPONSE => 'info',
            self::HELPER_RESPONSE_ACCEPTED, self::TRANSFER_CONFIRMED => 'success',
            self::HELPER_RESPONSE_REJECTED, self::HELPER_RESPONSE_CANCELED => 'danger',
            self::PLACEMENT_ENDED => 'warning',
            self::VACCINATION_REMINDER => 'primary',
            self::PET_BIRTHDAY => 'warning',
            self::EMAIL_VERIFICATION => 'info',
            self::NEW_MESSAGE => 'success',
        };
    }

    public function getDescription(): string
    {
        return __("messages.notifications.types.{$this->value}.description");
    }
}
