<?php

declare(strict_types=1);

namespace App\Enums;

enum EmailConfigurationStatus: string
{
    case ACTIVE = 'active';
    case INACTIVE = 'inactive';
    case DRAFT = 'draft';
}
