<?php

declare(strict_types=1);

namespace App\Enums;

enum HabitDaySummaryMode: string
{
    case AVERAGE_SCORED_PETS = 'average_scored_pets';
    case AVERAGE_ALL_PETS = 'average_all_pets';
    case SUM = 'sum';
}
