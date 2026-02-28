<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum UserRole: string implements HasColor, HasLabel
{
    case ADMIN = 'admin';
    case PREMIUM = 'premium';

    public function getLabel(): string
    {
        return match ($this) {
            self::ADMIN => 'Admin',
            self::PREMIUM => 'Premium User',
        };
    }

    public function getColor(): string
    {
        return match ($this) {
            self::ADMIN => 'danger',
            self::PREMIUM => 'warning',
        };
    }
}
