<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum EmailLogStatus: string implements HasColor, HasLabel
{
    case PENDING = 'pending';
    case ACCEPTED = 'accepted';
    case DELIVERED = 'delivered';
    case FAILED = 'failed';
    case BOUNCED = 'bounced';

    public function getLabel(): string
    {
        return match ($this) {
            self::PENDING => 'Pending',
            self::ACCEPTED => 'Accepted',
            self::DELIVERED => 'Delivered',
            self::FAILED => 'Failed',
            self::BOUNCED => 'Bounced',
        };
    }

    public function getColor(): string
    {
        return match ($this) {
            self::PENDING, self::ACCEPTED => 'warning',
            self::DELIVERED => 'success',
            self::FAILED, self::BOUNCED => 'danger',
        };
    }
}
