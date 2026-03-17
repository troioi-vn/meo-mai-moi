<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'Category',
    title: 'Category',
    description: 'Pet category/breed',
    required: ['id', 'name', 'slug', 'pet_type_id'],
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'name', type: 'string', example: 'Siamese'),
        new OA\Property(property: 'slug', type: 'string', example: 'siamese'),
        new OA\Property(property: 'pet_type_id', type: 'integer', example: 1),
        new OA\Property(property: 'description', type: 'string', nullable: true),
        new OA\Property(property: 'created_by', type: 'integer', nullable: true),
        new OA\Property(property: 'approved_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'usage_count', type: 'integer', example: 5),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
    ]
)]
class CategorySchema {}
