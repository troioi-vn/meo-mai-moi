<?php

declare(strict_types=1);

namespace App\Enums;

enum UnsubscribeChannel: string
{
    case EMAIL = 'email';
    case IN_APP = 'in_app';
    case TELEGRAM = 'telegram';
}
