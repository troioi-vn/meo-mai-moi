<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum PlacementRequestStatus: string implements HasColor, HasLabel
{
    case OPEN = 'open';
    case FULFILLED = 'fulfilled';
    case PENDING_TRANSFER = 'pending_transfer';
    case ACTIVE = 'active';
    case FINALIZED = 'finalized';
    case EXPIRED = 'expired';
    case CANCELLED = 'cancelled';

    public function getLabel(): ?string
    {
        return match ($this) {
            self::OPEN => 'Open',
            self::FULFILLED => 'Fulfilled',
            self::PENDING_TRANSFER => 'Pending Transfer',
            self::ACTIVE => 'Active',
            self::FINALIZED => 'Finalized',
            self::EXPIRED => 'Expired',
            self::CANCELLED => 'Cancelled',
        };
    }

    public function getColor(): string|array|null
    {
        return match ($this) {
            self::OPEN => 'info',
            self::FULFILLED => 'success',
            self::PENDING_TRANSFER, self::ACTIVE => 'primary',
            self::FINALIZED => 'warning',
            self::EXPIRED, self::CANCELLED => 'danger',
        };
    }
}
