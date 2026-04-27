<?php

declare(strict_types=1);

namespace App\Support;

final class ApiTokenPermissions
{
    public const array DEFAULT = [
        'read',
    ];

    public const array AVAILABLE = [
        'pet:read',
        'pet:write',
        'health:read',
        'health:write',
        'profile:read',
        'create',
        'read',
        'update',
        'delete',
    ];

    public const array GPT_CONNECTOR = self::AVAILABLE;
}
