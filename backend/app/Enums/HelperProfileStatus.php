<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum HelperProfileStatus: string implements HasColor, HasLabel
{
    case PRIVATE = 'private';
    case PUBLIC = 'public';
    case ARCHIVED = 'archived';
    case DELETED = 'deleted';

    /**
     * @return array<int, string>
     */
    public static function activeValues(): array
    {
        return [
            self::PRIVATE->value,
            self::PUBLIC->value,
        ];
    }

    public function isActive(): bool
    {
        return in_array($this, [self::PRIVATE, self::PUBLIC], true);
    }

    public function getLabel(): string
    {
        return match ($this) {
            self::PRIVATE => 'Private',
            self::PUBLIC => 'Public',
            self::ARCHIVED => 'Archived',
            self::DELETED => 'Deleted',
        };
    }

    public function getColor(): string
    {
        return match ($this) {
            self::PRIVATE => 'gray',
            self::PUBLIC => 'success',
            self::ARCHIVED => 'warning',
            self::DELETED => 'danger',
        };
    }
}
