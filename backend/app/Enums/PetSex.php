<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum PetSex: string implements HasColor, HasLabel
{
    case MALE = 'male';
    case FEMALE = 'female';
    case NOT_SPECIFIED = 'not_specified';

    public function getLabel(): string
    {
        return match ($this) {
            self::MALE => 'Male',
            self::FEMALE => 'Female',
            self::NOT_SPECIFIED => 'Not Specified',
        };
    }

    public function getColor(): string
    {
        return match ($this) {
            self::MALE => 'info',
            self::FEMALE => 'danger',
            self::NOT_SPECIFIED => 'gray',
        };
    }
}
