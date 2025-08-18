<?php

namespace App\Enums;

enum NotificationType: string
{
    case PLACEMENT_REQUEST_RESPONSE = 'placement_request_response';
    case PLACEMENT_REQUEST_ACCEPTED = 'placement_request_accepted';
    case HELPER_RESPONSE_ACCEPTED = 'helper_response_accepted';
    case HELPER_RESPONSE_REJECTED = 'helper_response_rejected';
    
    public function getGroup(): string
    {
        return match($this) {
            self::PLACEMENT_REQUEST_RESPONSE,
            self::PLACEMENT_REQUEST_ACCEPTED,
            self::HELPER_RESPONSE_ACCEPTED,
            self::HELPER_RESPONSE_REJECTED => 'helper_profile',
        };
    }
    
    public function getLabel(): string
    {
        return match($this) {
            self::PLACEMENT_REQUEST_RESPONSE => 'Response to Placement Request',
            self::PLACEMENT_REQUEST_ACCEPTED => 'Placement Request Accepted',
            self::HELPER_RESPONSE_ACCEPTED => 'Helper Response Accepted',
            self::HELPER_RESPONSE_REJECTED => 'Helper Response Rejected',
        };
    }
}