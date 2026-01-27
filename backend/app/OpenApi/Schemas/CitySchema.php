<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'City',
    title: 'City',
    required: ['id', 'name', 'country'],
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'name', type: 'string', example: 'Hanoi'),
        new OA\Property(property: 'slug', type: 'string', example: 'hanoi'),
        new OA\Property(property: 'country', type: 'string', example: 'VN'),
        new OA\Property(property: 'description', type: 'string', nullable: true, example: 'Capital city of Vietnam'),
        new OA\Property(property: 'created_by', type: 'integer', nullable: true, example: 1),
        new OA\Property(property: 'approved_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'usage_count', type: 'integer', example: 5),
    ]
)]
class CitySchema {}
