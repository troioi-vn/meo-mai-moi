<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'PetRelationship',
    title: 'Pet Relationship',
    required: ['id', 'user_id', 'pet_id', 'relationship_type', 'start_at', 'created_by'],
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'user_id', type: 'integer', example: 1),
        new OA\Property(property: 'pet_id', type: 'integer', example: 1),
        new OA\Property(property: 'relationship_type', type: 'string', enum: ['owner', 'foster', 'editor', 'viewer']),
        new OA\Property(property: 'start_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'end_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'created_by', type: 'integer', example: 1),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'user', ref: '#/components/schemas/User', nullable: true),
    ]
)]
class PetRelationshipSchema {}
