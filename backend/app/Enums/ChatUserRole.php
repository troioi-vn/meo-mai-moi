<?php

declare(strict_types=1);

namespace App\Enums;

enum ChatUserRole: string
{
    case MEMBER = 'member';
    case ADMIN = 'admin';

    public function getLabel(): string
    {
        return match ($this) {
            self::MEMBER => 'Member',
            self::ADMIN => 'Admin',
        };
    }
}
