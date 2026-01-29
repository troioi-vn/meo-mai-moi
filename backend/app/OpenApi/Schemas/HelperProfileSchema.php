<?php
declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'HelperProfile',
    title: 'HelperProfile',
    description: 'Helper Profile model',
    properties: [
        new OA\Property(property: 'id', type: 'integer', format: 'int64', description: 'Helper Profile ID'),
        new OA\Property(property: 'user_id', type: 'integer', format: 'int64', description: 'ID of the associated user'),
        new OA\Property(property: 'status', type: 'string', enum: ['active', 'archived', 'deleted'], description: 'Status of the helper profile'),
        new OA\Property(property: 'request_types', type: 'array', items: new OA\Items(type: 'string', enum: ['foster_paid', 'foster_free', 'permanent']), description: 'Types of placement requests this helper can respond to'),
        new OA\Property(property: 'country', type: 'string', description: 'ISO 3166-1 alpha-2 country code'),
        new OA\Property(property: 'state', type: 'string', nullable: true, description: 'State/Province'),
        new OA\Property(property: 'city', type: 'string', nullable: true, description: 'City'),
        new OA\Property(property: 'address', type: 'string', nullable: true, description: 'Street address'),
        new OA\Property(property: 'zip_code', type: 'string', nullable: true, description: 'ZIP/Postal code'),
        new OA\Property(property: 'contact_info', type: 'string', nullable: true, description: 'Additional contact information visible to pet owners when responding to placement requests'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Timestamp of helper profile creation'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Timestamp of last helper profile update'),
        new OA\Property(property: 'archived_at', type: 'string', format: 'date-time', nullable: true, description: 'Timestamp when the profile was archived'),
        new OA\Property(property: 'restored_at', type: 'string', format: 'date-time', nullable: true, description: 'Timestamp when the profile was restored'),
        new OA\Property(property: 'deleted_at', type: 'string', format: 'date-time', nullable: true, description: 'Timestamp when the profile was deleted'),
    ]
)]
class HelperProfileSchema {}