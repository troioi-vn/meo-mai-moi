<?php

namespace App\Enums;

enum PlacementRequestStatus: string
{
    case OPEN = 'open';
    case PENDING_REVIEW = 'pending_review';
    case FULFILLED = 'fulfilled';
    case EXPIRED = 'expired';
    case CANCELLED = 'cancelled';
}
