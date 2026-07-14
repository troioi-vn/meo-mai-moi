<?php

declare(strict_types=1);

namespace App\Enums;

enum ResourceInvitationType: string
{
    case PET = 'pet';
    case GROUP = 'group';
    case LEDGER = 'ledger';
}
