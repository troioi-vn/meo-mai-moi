<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum PlacementRequestType: string implements HasColor, HasLabel
{
    case FOSTER_PAID = 'foster_paid';
    case FOSTER_FREE = 'foster_free';
    case PERMANENT = 'permanent';
    case PET_SITTING = 'pet_sitting';

    public function getLabel(): string
    {
        return __("messages.enums.placement_request_type.{$this->value}");
    }

    public function getColor(): string
    {
        return match ($this) {
            self::FOSTER_PAID => 'warning',
            self::FOSTER_FREE => 'info',
            self::PERMANENT => 'success',
            self::PET_SITTING => 'primary',
        };
    }
}
