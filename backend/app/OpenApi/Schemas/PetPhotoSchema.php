<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'PetPhoto',
    title: 'Pet Photo',
    required: ['id', 'url', 'is_primary'],
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'url', type: 'string'),
        new OA\Property(property: 'thumb_url', type: 'string', nullable: true),
        new OA\Property(property: 'is_primary', type: 'boolean'),
    ]
)]
class PetPhotoSchema {}
