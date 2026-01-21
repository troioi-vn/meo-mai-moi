<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum PetStatus: string implements HasColor, HasLabel
{
    case ACTIVE = 'active';
    case LOST = 'lost';
    case DECEASED = 'deceased';
    case DELETED = 'deleted';

    public function getLabel(): ?string
    {
        return match ($this) {
            self::ACTIVE => 'Active',
            self::LOST => 'Lost',
            self::DECEASED => 'Deceased',
            self::DELETED => 'Deleted',
        };
    }

    public function getColor(): string|array|null
    {
        return match ($this) {
            self::ACTIVE => 'success',
            self::LOST => 'warning',
            self::DECEASED => 'info',
            self::DELETED => 'danger',
        };
    }
}
