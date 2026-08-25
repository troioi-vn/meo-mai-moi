<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'Litter',
    title: 'Litter',
    required: ['id', 'name', 'pet_type_id', 'created_by'],
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'name', type: 'string', example: 'Litter, 24 Aug 2026'),
        new OA\Property(property: 'pet_type_id', type: 'integer', example: 1),
        new OA\Property(property: 'created_by', type: 'integer', nullable: true, example: 5),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'pet_type', ref: '#/components/schemas/PetType', nullable: true),
        new OA\Property(
            property: 'pets',
            type: 'array',
            items: new OA\Items(ref: '#/components/schemas/Pet')
        ),
    ]
)]
#[OA\Schema(
    schema: 'LitterResponse',
    title: 'Litter Response',
    properties: [
        new OA\Property(property: 'data', ref: '#/components/schemas/Litter'),
    ]
)]
class LitterSchema {}
