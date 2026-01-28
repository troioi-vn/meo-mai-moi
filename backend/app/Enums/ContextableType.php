<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasLabel;

enum ContextableType: string implements HasLabel
{
    case PLACEMENT_REQUEST = 'PlacementRequest';
    case PET = 'Pet';

    public function getLabel(): string
    {
        return match ($this) {
            self::PLACEMENT_REQUEST => 'Placement Request',
            self::PET => 'Pet',
        };
    }

    public function getModelClass(): string
    {
        return match ($this) {
            self::PLACEMENT_REQUEST => \App\Models\PlacementRequest::class,
            self::PET => \App\Models\Pet::class,
        };
    }
}
