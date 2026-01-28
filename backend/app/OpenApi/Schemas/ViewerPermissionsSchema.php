<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'ViewerPermissions',
    title: 'Viewer Permissions',
    properties: [
        new OA\Property(property: 'can_edit', type: 'boolean'),
        new OA\Property(property: 'can_view_contact', type: 'boolean'),
        new OA\Property(property: 'can_delete', type: 'boolean'),
        new OA\Property(property: 'is_owner', type: 'boolean'),
        new OA\Property(property: 'is_viewer', type: 'boolean'),
    ]
)]
class ViewerPermissionsSchema {}
