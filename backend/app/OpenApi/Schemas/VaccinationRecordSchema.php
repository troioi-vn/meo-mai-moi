<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'VaccinationRecord',
    title: 'VaccinationRecord',
    description: 'Vaccination record model',
    properties: [
        new OA\Property(property: 'id', type: 'integer', format: 'int64'),
        new OA\Property(property: 'pet_id', type: 'integer', format: 'int64'),
        new OA\Property(property: 'vaccine_name', type: 'string'),
        new OA\Property(property: 'administered_at', type: 'string', format: 'date'),
        new OA\Property(property: 'due_at', type: 'string', format: 'date'),
        new OA\Property(property: 'notes', type: 'string'),
        new OA\Property(property: 'reminder_sent_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'completed_at', type: 'string', format: 'date-time', nullable: true, description: 'When set, indicates the record is completed/renewed and no longer active'),
        new OA\Property(property: 'photo_url', type: 'string', nullable: true, description: 'URL to the vaccination photo'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
    ]
)]
class VaccinationRecordSchema
{
    // Exists solely for OpenAPI schema generation
}
