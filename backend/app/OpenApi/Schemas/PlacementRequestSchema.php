<?php
declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'PlacementRequest',
    type: 'object',
    title: 'PlacementRequest',
    required: ['id', 'pet_id', 'user_id', 'request_type', 'status'],
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'pet_id', type: 'integer', example: 2),
        new OA\Property(property: 'user_id', type: 'integer', example: 5),
        new OA\Property(property: 'request_type', type: 'string', example: 'adoption'),
        new OA\Property(property: 'status', type: 'string', example: 'pending'),
        new OA\Property(property: 'notes', type: 'string', example: 'Looking for a loving home.'),
        new OA\Property(property: 'expires_at', type: 'string', format: 'date', example: '2025-08-01'),
        new OA\Property(property: 'start_date', type: 'string', format: 'date', example: '2025-08-05'),
        new OA\Property(property: 'end_date', type: 'string', format: 'date', example: '2025-08-20'),
    ]
)]
class PlacementRequestSchema {}