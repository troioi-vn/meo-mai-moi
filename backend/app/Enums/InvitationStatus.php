<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum InvitationStatus: string implements HasColor, HasLabel
{
    case PENDING = 'pending';
    case ACCEPTED = 'accepted';
    case EXPIRED = 'expired';
    case REVOKED = 'revoked';

    public function getLabel(): ?string
    {
        return match ($this) {
            self::PENDING => 'Pending',
            self::ACCEPTED => 'Accepted',
            self::EXPIRED => 'Expired',
            self::REVOKED => 'Revoked',
        };
    }

    public function getColor(): string|array|null
    {
        return match ($this) {
            self::PENDING => 'warning',
            self::ACCEPTED => 'success',
            self::EXPIRED => 'danger',
            self::REVOKED => 'gray',
        };
    }
}
