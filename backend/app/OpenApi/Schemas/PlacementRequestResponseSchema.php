<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'PlacementRequestResponse',
    title: 'PlacementRequestResponse',
    description: "Tracks a helper's response to a placement request",
    properties: [
        new OA\Property(property: 'id', type: 'integer', format: 'int64', description: 'Response ID'),
        new OA\Property(property: 'placement_request_id', type: 'integer', format: 'int64', description: 'ID of the placement request'),
        new OA\Property(property: 'helper_profile_id', type: 'integer', format: 'int64', description: 'ID of the helper profile'),
        new OA\Property(property: 'status', type: 'string', enum: ['responded', 'accepted', 'rejected', 'cancelled'], description: 'Current status of the response'),
        new OA\Property(property: 'message', type: 'string', nullable: true, description: 'Optional message from the helper'),
        new OA\Property(property: 'responded_at', type: 'string', format: 'date-time', description: 'When the helper responded'),
        new OA\Property(property: 'accepted_at', type: 'string', format: 'date-time', nullable: true, description: 'When the owner accepted'),
        new OA\Property(property: 'rejected_at', type: 'string', format: 'date-time', nullable: true, description: 'When the owner rejected'),
        new OA\Property(property: 'cancelled_at', type: 'string', format: 'date-time', nullable: true, description: 'When the helper cancelled'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
class PlacementRequestResponseSchema {}
