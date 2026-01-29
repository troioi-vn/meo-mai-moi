<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'User',
    title: 'User',
    description: 'User model',
    required: ['id', 'name', 'email', 'is_banned', 'has_password', 'created_at', 'updated_at'],
    properties: [
        new OA\Property(property: 'id', type: 'integer', format: 'int64', description: 'User ID'),
        new OA\Property(property: 'name', type: 'string', description: "User's name"),
        new OA\Property(property: 'email', type: 'string', format: 'email', description: "User's email address"),
        new OA\Property(property: 'avatar_url', type: 'string', nullable: true, description: "URL to the user's avatar image"),
        new OA\Property(property: 'is_banned', type: 'boolean', description: 'Whether the user is banned (read-only access)'),
        new OA\Property(property: 'banned_at', type: 'string', format: 'date-time', nullable: true, description: 'Timestamp when the user was banned'),
        new OA\Property(property: 'ban_reason', type: 'string', nullable: true, description: 'Reason for the ban'),
        new OA\Property(property: 'has_password', type: 'boolean', description: 'Whether the user has a local password set'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Timestamp of user creation'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Timestamp of last user update'),
    ]
)]
class UserSchema {}
