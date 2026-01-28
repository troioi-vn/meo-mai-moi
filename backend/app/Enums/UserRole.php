<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum UserRole: string implements HasColor, HasLabel
{
    case ADMIN = 'admin';
    case CAT_OWNER = 'cat_owner';
    case HELPER = 'helper';
    case VIEWER = 'viewer';

    public function getLabel(): string
    {
        return match ($this) {
            self::ADMIN => 'Admin',
            self::CAT_OWNER => 'Pet Owner',
            self::HELPER => 'Helper/Foster',
            self::VIEWER => 'Viewer',
        };
    }

    public function getColor(): string
    {
        return match ($this) {
            self::ADMIN => 'danger',
            self::CAT_OWNER => 'success',
            self::HELPER => 'info',
            self::VIEWER => 'gray',
        };
    }
}
