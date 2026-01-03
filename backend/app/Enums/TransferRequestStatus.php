<?php

namespace App\Enums;

enum TransferRequestStatus: string
{
    case PENDING = 'pending';
    case CONFIRMED = 'confirmed';
    case REJECTED = 'rejected';
    case EXPIRED = 'expired';
    case CANCELED = 'canceled';
}
