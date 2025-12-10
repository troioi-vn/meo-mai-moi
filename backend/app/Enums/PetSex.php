<?php

namespace App\Enums;

enum PetSex: string
{
    case MALE = 'male';
    case FEMALE = 'female';
    case NOT_SPECIFIED = 'not_specified';

    public function label(): string
    {
        return match ($this) {
            self::MALE => 'Male',
            self::FEMALE => 'Female',
            self::NOT_SPECIFIED => 'Not Specified',
        };
    }
}
