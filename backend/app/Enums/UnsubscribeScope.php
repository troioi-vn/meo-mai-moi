<?php

declare(strict_types=1);

namespace App\Enums;

enum UnsubscribeScope: string
{
    case ALL = 'all';
    case TYPE = 'type';
}
