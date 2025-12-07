<?php

namespace App\Enums;

enum PlacementRequestStatus: string
{
    case OPEN = 'open';
    case FULFILLED = 'fulfilled';
    case PENDING_TRANSFER = 'pending_transfer';
    case ACTIVE = 'active';
    case FINALIZED = 'finalized';
    case EXPIRED = 'expired';
    case CANCELLED = 'cancelled';
}
