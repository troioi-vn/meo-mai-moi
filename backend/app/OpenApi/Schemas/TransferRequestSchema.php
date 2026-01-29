<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'TransferRequest',
    title: 'TransferRequest',
    description: 'Transfer Request model - represents physical transfer of pet(s) between users',
    properties: [
        new OA\Property(property: 'id', type: 'integer', format: 'int64', description: 'Transfer Request ID'),
        new OA\Property(property: 'placement_request_id', type: 'integer', format: 'int64', description: 'ID of the parent placement request'),
        new OA\Property(property: 'placement_request_response_id', type: 'integer', format: 'int64', description: 'ID of the accepted response'),
        new OA\Property(property: 'from_user_id', type: 'integer', format: 'int64', description: 'ID of the user transferring the pet (sender)'),
        new OA\Property(property: 'to_user_id', type: 'integer', format: 'int64', description: 'ID of the user receiving the pet (recipient)'),
        new OA\Property(property: 'status', type: 'string', enum: ['pending', 'confirmed', 'rejected', 'expired', 'canceled'], description: 'Current status of the transfer request'),
        new OA\Property(property: 'confirmed_at', type: 'string', format: 'date-time', nullable: true, description: 'Timestamp when the transfer was confirmed'),
        new OA\Property(property: 'rejected_at', type: 'string', format: 'date-time', nullable: true, description: 'Timestamp when the request was rejected'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Timestamp of transfer request creation'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Timestamp of last transfer request update'),
    ]
)]
class TransferRequestSchema {}
