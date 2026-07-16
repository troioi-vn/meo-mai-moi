<?php

declare(strict_types=1);

namespace App\Enums;

enum GroupRole: string
{
    case ADMIN = 'admin';
    case MEMBER = 'member';

    public function canManageGroup(): bool
    {
        return $this === self::ADMIN;
    }

    public function canEditPets(): bool
    {
        return true;
    }
}
