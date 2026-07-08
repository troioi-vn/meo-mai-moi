<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'MedicalRecord',
    title: 'MedicalRecord',
    description: 'Medical record model',
    properties: [
        new OA\Property(property: 'id', type: 'integer', format: 'int64'),
        new OA\Property(property: 'pet_id', type: 'integer', format: 'int64'),
        new OA\Property(property: 'record_type', type: 'string'),
        new OA\Property(property: 'description', type: 'string'),
        new OA\Property(property: 'record_date', type: 'string', format: 'date'),
        new OA\Property(property: 'vet_name', type: 'string', nullable: true),
        new OA\Property(
            property: 'photos',
            type: 'array',
            items: new OA\Items(ref: '#/components/schemas/MediaImage')
        ),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
    ]
)]
class MedicalRecordSchema
{
    // Exists solely for OpenAPI schema generation
}
