<?php

declare(strict_types=1);

namespace App\Enums;

enum HabitValueType: string
{
    case YES_NO = 'yes_no';
    case INTEGER_SCALE = 'integer_scale';
}
