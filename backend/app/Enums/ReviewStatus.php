<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum ReviewStatus: string implements HasColor, HasLabel
{
    case PENDING = 'pending';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case FLAGGED = 'flagged';
    case ACTIVE = 'active';
    case HIDDEN = 'hidden';
    case DELETED = 'deleted';

    public function getLabel(): string
    {
        return match ($this) {
            self::PENDING => 'Pending',
            self::APPROVED => 'Approved',
            self::REJECTED => 'Rejected',
            self::FLAGGED => 'Flagged',
            self::ACTIVE => 'Active',
            self::HIDDEN => 'Hidden',
            self::DELETED => 'Deleted',
        };
    }

    public function getColor(): string
    {
        return match ($this) {
            self::PENDING => 'warning',
            self::APPROVED, self::ACTIVE => 'success',
            self::REJECTED, self::HIDDEN => 'danger',
            self::FLAGGED => 'warning',
            self::DELETED => 'gray',
        };
    }
}
