<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'GroupSummary',
    required: ['id', 'name', 'viewer_role', 'member_count', 'pet_count'],
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'viewer_role', type: 'string', enum: ['admin', 'member'], nullable: true),
        new OA\Property(property: 'member_count', type: 'integer'),
        new OA\Property(property: 'pet_count', type: 'integer'),
    ],
    type: 'object'
)]
#[OA\Schema(
    schema: 'GroupMember',
    required: ['user_id', 'role', 'start_at'],
    properties: [
        new OA\Property(property: 'user_id', type: 'integer'),
        new OA\Property(property: 'role', type: 'string', enum: ['admin', 'member'], nullable: true),
        new OA\Property(property: 'start_at', type: 'string', format: 'date-time'),
        new OA\Property(
            property: 'user',
            properties: [
                new OA\Property(property: 'id', type: 'integer'),
                new OA\Property(property: 'name', type: 'string'),
            ],
            type: 'object',
            nullable: true
        ),
    ],
    type: 'object'
)]
#[OA\Schema(
    schema: 'GroupPetSummary',
    properties: [
        new OA\Property(property: 'id', type: 'integer', nullable: true),
        new OA\Property(property: 'name', type: 'string', nullable: true),
        new OA\Property(property: 'photo_url', type: 'string', nullable: true),
        new OA\Property(
            property: 'pet_type',
            properties: [
                new OA\Property(property: 'id', type: 'integer'),
                new OA\Property(property: 'name', type: 'string'),
            ],
            type: 'object',
            nullable: true
        ),
    ],
    type: 'object'
)]
#[OA\Schema(
    schema: 'Group',
    required: [
        'id',
        'name',
        'created_by_user_id',
        'member_count',
        'pet_count',
        'pets',
        'members',
    ],
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'created_by_user_id', type: 'integer'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'viewer_role', type: 'string', enum: ['admin', 'member'], nullable: true),
        new OA\Property(property: 'member_count', type: 'integer'),
        new OA\Property(property: 'pet_count', type: 'integer'),
        new OA\Property(
            property: 'pets',
            type: 'array',
            items: new OA\Items(ref: '#/components/schemas/GroupPetSummary')
        ),
        new OA\Property(
            property: 'members',
            type: 'array',
            items: new OA\Items(ref: '#/components/schemas/GroupMember')
        ),
    ],
    type: 'object'
)]
class GroupSchemas {}
