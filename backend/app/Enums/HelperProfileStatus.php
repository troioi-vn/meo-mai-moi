<?php

declare(strict_types=1);

namespace App\Enums;

enum HelperProfileStatus: string
{
    case ACTIVE = 'active';
    case ARCHIVED = 'archived';
    case DELETED = 'deleted';
}
