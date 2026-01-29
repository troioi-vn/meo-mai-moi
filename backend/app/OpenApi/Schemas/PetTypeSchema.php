<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'PetType',
    title: 'Pet Type',
    required: ['id', 'name', 'slug', 'is_active', 'is_system', 'display_order', 'placement_requests_allowed'],
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'name', type: 'string', example: 'Cat'),
        new OA\Property(property: 'slug', type: 'string', example: 'cat'),
        new OA\Property(property: 'description', type: 'string', nullable: true),
        new OA\Property(property: 'is_active', type: 'boolean', example: true),
        new OA\Property(property: 'is_system', type: 'boolean', example: true),
        new OA\Property(property: 'display_order', type: 'integer', example: 0),
        new OA\Property(property: 'placement_requests_allowed', type: 'boolean', example: true),
        new OA\Property(property: 'weight_tracking_allowed', type: 'boolean', nullable: true),
        new OA\Property(property: 'microchips_allowed', type: 'boolean', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
    ]
)]
class PetTypeSchema {}
