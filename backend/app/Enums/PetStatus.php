<?php

declare(strict_types=1);

namespace App\Enums;

enum PetStatus: string
{
    case ACTIVE = 'active';
    case LOST = 'lost';
    case DECEASED = 'deceased';
    case DELETED = 'deleted';
}
