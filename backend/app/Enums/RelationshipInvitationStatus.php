<?php

declare(strict_types=1);

namespace App\Enums;

enum RelationshipInvitationStatus: string
{
    case PENDING = 'pending';
    case ACCEPTED = 'accepted';
    case DECLINED = 'declined';
    case REVOKED = 'revoked';
    case EXPIRED = 'expired';
}
