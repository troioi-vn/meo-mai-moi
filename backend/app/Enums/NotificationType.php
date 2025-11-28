<?php

namespace App\Enums;

enum NotificationType: string
{
    case PLACEMENT_REQUEST_RESPONSE = 'placement_request_response';
    case PLACEMENT_REQUEST_ACCEPTED = 'placement_request_accepted';
    case HELPER_RESPONSE_ACCEPTED = 'helper_response_accepted';
    case HELPER_RESPONSE_REJECTED = 'helper_response_rejected';
    case FOSTER_ASSIGNMENT_COMPLETED = 'foster_assignment_completed';
    case FOSTER_ASSIGNMENT_CANCELED = 'foster_assignment_canceled';
    case VACCINATION_REMINDER = 'vaccination_reminder';
    case PET_BIRTHDAY = 'pet_birthday';
    case EMAIL_VERIFICATION = 'email_verification';

    public function getGroup(): string
    {
        return match ($this) {
            self::PLACEMENT_REQUEST_RESPONSE,
            self::PLACEMENT_REQUEST_ACCEPTED,
            self::HELPER_RESPONSE_ACCEPTED,
            self::HELPER_RESPONSE_REJECTED,
            self::FOSTER_ASSIGNMENT_COMPLETED,
            self::FOSTER_ASSIGNMENT_CANCELED => 'helper_profile',
            self::VACCINATION_REMINDER,
            self::PET_BIRTHDAY => 'pet_health',
            self::EMAIL_VERIFICATION => 'account_security',
        };
    }

    public function getLabel(): string
    {
        return match ($this) {
            self::PLACEMENT_REQUEST_RESPONSE => 'Response to Placement Request',
            self::PLACEMENT_REQUEST_ACCEPTED => 'Placement Request Accepted',
            self::HELPER_RESPONSE_ACCEPTED => 'Helper Response Accepted',
            self::HELPER_RESPONSE_REJECTED => 'Helper Response Rejected',
            self::FOSTER_ASSIGNMENT_COMPLETED => 'Foster Assignment Completed',
            self::FOSTER_ASSIGNMENT_CANCELED => 'Foster Assignment Canceled',
            self::VACCINATION_REMINDER => 'Vaccination Due Soon',
            self::PET_BIRTHDAY => 'Pet Birthday',
            self::EMAIL_VERIFICATION => 'Email Verification Required',
        };
    }
}
