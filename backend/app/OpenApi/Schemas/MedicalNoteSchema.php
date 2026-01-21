<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'MedicalNote',
    title: 'MedicalNote',
    description: 'Medical note model',
    properties: [
        new OA\Property(property: 'id', type: 'integer', format: 'int64'),
        new OA\Property(property: 'pet_id', type: 'integer', format: 'int64'),
        new OA\Property(property: 'note', type: 'string'),
        new OA\Property(property: 'record_date', type: 'string', format: 'date'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
    ]
)]
class MedicalNoteSchema
{
    // This class exists solely for OpenAPI schema generation
}
