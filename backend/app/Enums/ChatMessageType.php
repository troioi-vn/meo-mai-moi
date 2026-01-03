<?php

namespace App\Enums;

enum ChatMessageType: string
{
    case TEXT = 'text';

    public function getLabel(): string
    {
        return match ($this) {
            self::TEXT => 'Text',
        };
    }
}


