<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasLabel;

enum ChatMessageType: string implements HasLabel
{
    case TEXT = 'text';

    public function getLabel(): string
    {
        return match ($this) {
            self::TEXT => 'Text',
        };
    }
}
