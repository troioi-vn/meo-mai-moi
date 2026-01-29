<?php
declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'Pet',
    type: 'object',
    title: 'Pet',
    required: ['id', 'name', 'country', 'description', 'status', 'created_by', 'pet_type_id'],
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'name', type: 'string', example: 'Whiskers'),
        new OA\Property(property: 'sex', type: 'string', enum: ['male', 'female', 'not_specified'], example: 'male', description: 'Sex of the pet'),
        new OA\Property(property: 'birthday', type: 'string', format: 'date', example: '2020-01-01', nullable: true, description: 'Exact birthday (present only when birthday_precision=day). Deprecated: prefer component fields.', deprecated: true),
        new OA\Property(property: 'birthday_year', type: 'integer', example: 2020, nullable: true, description: 'Birth year when known (year/month/day precision).'),
        new OA\Property(property: 'birthday_month', type: 'integer', example: 5, nullable: true, description: 'Birth month when known (month/day precision).'),
        new OA\Property(property: 'birthday_day', type: 'integer', example: 12, nullable: true, description: 'Birth day when known (day precision).'),
        new OA\Property(property: 'birthday_precision', type: 'string', enum: ['day', 'month', 'year', 'unknown'], example: 'month', description: 'Precision level for birthday components.'),
        new OA\Property(property: 'country', type: 'string', example: 'VN', description: 'ISO 3166-1 alpha-2 country code'),
        new OA\Property(property: 'state', type: 'string', example: 'Hanoi', nullable: true),
        new OA\Property(property: 'address', type: 'string', example: '123 Main St', nullable: true),
        new OA\Property(property: 'description', type: 'string', example: 'A friendly pet.'),
        new OA\Property(property: 'status', type: 'string', example: 'active'),
        new OA\Property(property: 'created_by', type: 'integer', example: 5, description: 'ID of user who created this pet'),
        new OA\Property(property: 'pet_type_id', type: 'integer', example: 1),
        new OA\Property(property: 'photo_url', type: 'string', nullable: true),
        new OA\Property(property: 'photos', type: 'array', items: new OA\Items(ref: '#/components/schemas/PetPhoto')),
        new OA\Property(property: 'user_id', type: 'integer'),
        new OA\Property(property: 'pet_type', ref: '#/components/schemas/PetType'),
        new OA\Property(property: 'city', ref: '#/components/schemas/City', nullable: true),
        new OA\Property(property: 'categories', type: 'array', items: new OA\Items(ref: '#/components/schemas/Category')),
        new OA\Property(property: 'viewer_permissions', ref: '#/components/schemas/ViewerPermissions', nullable: true),
        new OA\Property(property: 'relationships', type: 'array', items: new OA\Items(ref: '#/components/schemas/PetRelationship')),
        new OA\Property(property: 'placement_requests', type: 'array', items: new OA\Items(ref: '#/components/schemas/PlacementRequest')),
    ]
)]
class PetSchema {}