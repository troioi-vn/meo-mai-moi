<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum PetRelationshipType: string implements HasColor, HasLabel
{
    case OWNER = 'owner';
    case FOSTER = 'foster';
    case SITTER = 'sitter';
    case EDITOR = 'editor';
    case VIEWER = 'viewer';

    public function getLabel(): ?string
    {
        return match ($this) {
            self::OWNER => 'Owner',
            self::FOSTER => 'Foster',
            self::SITTER => 'Sitter',
            self::EDITOR => 'Editor',
            self::VIEWER => 'Viewer',
        };
    }

    public function getColor(): string|array|null
    {
        return match ($this) {
            self::OWNER => 'primary',
            self::FOSTER => 'success',
            self::SITTER => 'warning',
            self::EDITOR => 'info',
            self::VIEWER => 'gray',
        };
    }
}
