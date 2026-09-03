<?php

declare(strict_types=1);

namespace App\Support;

final class ApiTokenPermissions
{
    public const array DEFAULT = [
        'read',
    ];

    public const array AVAILABLE = [
        // Generic abilities. Kept because existing tokens hold them.
        'create',
        'read',
        'update',
        'delete',

        // Scoped abilities. Must match the `require.pat.ability` names in
        // routes/api.php exactly — routes are the source of truth. Note the
        // asymmetry: reads are `pets:read` (plural), writes are `pet:write`
        // (singular).
        'finance:read',
        'finance:write',
        'groups:read',
        'groups:write',
        'habits:read',
        'habits:write',
        'health:read',
        'health:write',
        'helpers:read',
        'helpers:write',
        'invitations:read',
        'invitations:write',
        'messages:read',
        'messages:write',
        'microchips:read',
        'microchips:write',
        'notifications:read',
        'notifications:write',
        'pets:read',
        'pet:write',
        'placement:read',
        'placement:write',
        'profile:read',
        'profile:write',
        'sharing:read',
        'sharing:write',
    ];
}
