<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'MediaImage',
    title: 'Media Image',
    description: 'Shared image payload for Media Library-backed images. The url field is the default display URL and may point to a generated conversion rather than the original upload.',
    required: ['id', 'url', 'is_primary', 'processing'],
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'url', type: 'string', description: 'Default display URL for this image'),
        new OA\Property(property: 'thumb_url', type: 'string', nullable: true),
        new OA\Property(property: 'medium_url', type: 'string', nullable: true),
        new OA\Property(property: 'webp_url', type: 'string', nullable: true),
        new OA\Property(property: 'is_primary', type: 'boolean'),
        new OA\Property(property: 'processing', type: 'boolean', description: 'True when one or more expected generated conversions are not ready yet'),
    ]
)]
class MediaImageSchema {}
