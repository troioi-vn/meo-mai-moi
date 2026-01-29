<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'PetMicrochip',
    title: 'PetMicrochip',
    description: 'Pet Microchip model',
    properties: [
        new OA\Property(property: 'id', type: 'integer', format: 'int64', description: 'Microchip ID'),
        new OA\Property(property: 'pet_id', type: 'integer', format: 'int64', description: 'ID of the associated pet'),
        new OA\Property(property: 'chip_number', type: 'string', description: 'Unique microchip number'),
        new OA\Property(property: 'issuer', type: 'string', nullable: true, description: 'Microchip issuer/manufacturer'),
        new OA\Property(property: 'implanted_at', type: 'string', format: 'date', nullable: true, description: 'Date the microchip was implanted'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Timestamp of microchip record creation'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Timestamp of last microchip record update'),
    ]
)]
class PetMicrochipSchema {}
