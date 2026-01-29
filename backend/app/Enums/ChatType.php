<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum ChatType: string implements HasColor, HasLabel
{
    case DIRECT = 'direct';
    case PRIVATE_GROUP = 'private_group';
    case PUBLIC_GROUP = 'public_group';

    public function getLabel(): string
    {
        return match ($this) {
            self::DIRECT => 'Direct Message',
            self::PRIVATE_GROUP => 'Private Group',
            self::PUBLIC_GROUP => 'Public Group',
        };
    }

    public function getColor(): string
    {
        return match ($this) {
            self::DIRECT => 'primary',
            self::PRIVATE_GROUP => 'success',
            self::PUBLIC_GROUP => 'warning',
        };
    }
}
