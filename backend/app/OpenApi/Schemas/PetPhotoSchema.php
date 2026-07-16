<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'PetPhoto',
    title: 'Pet Photo',
    description: 'Pet photo payload. The url field is the default display URL and may point to a generated conversion rather than the original upload.',
    required: ['id', 'url', 'is_primary', 'processing'],
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'url', type: 'string', description: 'Default display URL for this image'),
        new OA\Property(property: 'thumb_url', type: 'string', nullable: true),
        new OA\Property(property: 'medium_url', type: 'string', nullable: true),
        new OA\Property(property: 'webp_url', type: 'string', nullable: true),
        new OA\Property(property: 'srcset', type: 'string', nullable: true),
        new OA\Property(
            property: 'sources',
            type: 'array',
            items: new OA\Items(
                required: ['type', 'srcset'],
                properties: [
                    new OA\Property(property: 'type', type: 'string'),
                    new OA\Property(property: 'srcset', type: 'string'),
                ],
                type: 'object',
            ),
        ),
        new OA\Property(property: 'width', type: 'integer', nullable: true),
        new OA\Property(property: 'height', type: 'integer', nullable: true),
        new OA\Property(property: 'is_primary', type: 'boolean'),
        new OA\Property(property: 'processing', type: 'boolean', description: 'True when one or more expected generated conversions are not ready yet'),
    ]
)]
class PetPhotoSchema {}
