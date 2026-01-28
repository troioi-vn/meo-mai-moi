<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum WaitlistEntryStatus: string implements HasColor, HasLabel
{
    case PENDING = 'pending';
    case INVITED = 'invited';

    public function getLabel(): string
    {
        return match ($this) {
            self::PENDING => 'Pending',
            self::INVITED => 'Invited',
        };
    }

    public function getColor(): string
    {
        return match ($this) {
            self::PENDING => 'warning',
            self::INVITED => 'success',
        };
    }
}
