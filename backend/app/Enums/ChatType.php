<?php

namespace App\Enums;

enum ChatType: string
{
    case DIRECT = 'direct';
    case PRIVATE_GROUP = 'private_group';
    case PUBLIC_GROUP = 'public_group';

    public function getLabel(): string
    {
        return match ($this) {
            self::DIRECT => 'Direct Message',
            self::PRIVATE_GROUP => 'Private Group',
            self::PUBLIC_GROUP => 'Public Group',
        };
    }
}
