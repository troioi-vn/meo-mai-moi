<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'PetAccessSource',
    title: 'Pet Access Source',
    properties: [
        new OA\Property(property: 'type', type: 'string', enum: ['relationship', 'group']),
        new OA\Property(property: 'role', type: 'string'),
        new OA\Property(property: 'id', type: 'integer', nullable: true),
        new OA\Property(property: 'name', type: 'string', nullable: true),
    ]
)]
#[OA\Schema(
    schema: 'ViewerPermissions',
    title: 'Viewer Permissions',
    description: 'Authenticated private pet viewer permissions. Public pet responses use a subset without access_sources.',
    properties: [
        new OA\Property(property: 'can_edit', type: 'boolean'),
        new OA\Property(property: 'can_delete', type: 'boolean'),
        new OA\Property(property: 'can_manage_people', type: 'boolean'),
        new OA\Property(property: 'can_transfer_ownership', type: 'boolean'),
        new OA\Property(property: 'can_view_contact', type: 'boolean'),
        new OA\Property(property: 'is_owner', type: 'boolean'),
        new OA\Property(property: 'is_editor', type: 'boolean'),
        new OA\Property(property: 'is_viewer', type: 'boolean'),
        new OA\Property(property: 'is_foster', type: 'boolean'),
        new OA\Property(property: 'is_sitter', type: 'boolean'),
        new OA\Property(
            property: 'access_sources',
            type: 'array',
            items: new OA\Items(ref: '#/components/schemas/PetAccessSource')
        ),
        new OA\Property(
            property: 'has_active_relationship',
            type: 'boolean',
            description: 'Present on public pet responses only'
        ),
    ]
)]
class ViewerPermissionsSchema {}
