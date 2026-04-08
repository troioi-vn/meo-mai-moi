<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum PlacementRequestType: string implements HasColor, HasLabel
{
    case PERMANENT = 'permanent';
    case FOSTER_FREE = 'foster_free';
    case FOSTER_PAID = 'foster_paid';
    case PET_SITTING = 'pet_sitting';

    public function getLabel(): string
    {
        return __("messages.enums.placement_request_type.{$this->value}");
    }

    public function getColor(): string
    {
        return match ($this) {
            self::PERMANENT => 'success',
            self::FOSTER_FREE => 'info',
            self::FOSTER_PAID => 'warning',
            self::PET_SITTING => 'primary',
        };
    }
}
