<?php

declare(strict_types=1);

namespace App\Enums;

enum ReviewStatus: string
{
    case PENDING = 'pending';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case FLAGGED = 'flagged';
    case ACTIVE = 'active';
    case HIDDEN = 'hidden';
    case DELETED = 'deleted';
}
