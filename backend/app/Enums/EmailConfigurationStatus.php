<?php

namespace App\Enums;

enum EmailConfigurationStatus: string
{
    case ACTIVE = 'active';
    case INACTIVE = 'inactive';
    case DRAFT = 'draft';
}
