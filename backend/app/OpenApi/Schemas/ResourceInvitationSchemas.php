<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'ResourceInvitationPreview',
    discriminator: new OA\Discriminator(
        propertyName: 'type',
        mapping: [
            'pet' => '#/components/schemas/PetResourceInvitationPreview',
            'group' => '#/components/schemas/GroupResourceInvitationPreview',
            'ledger' => '#/components/schemas/LedgerResourceInvitationPreview',
        ]
    ),
    oneOf: [
        new OA\Schema(ref: '#/components/schemas/PetResourceInvitationPreview'),
        new OA\Schema(ref: '#/components/schemas/GroupResourceInvitationPreview'),
        new OA\Schema(ref: '#/components/schemas/LedgerResourceInvitationPreview'),
    ]
)]
#[OA\Schema(
    schema: 'PetResourceInvitationPreview',
    required: ['type', 'status', 'expires_at', 'is_valid', 'is_authenticated', 'inviter', 'target'],
    properties: [
        new OA\Property(property: 'type', type: 'string', enum: ['pet']),
        new OA\Property(
            property: 'status',
            type: 'string',
            enum: ['pending', 'accepted', 'declined', 'revoked', 'expired']
        ),
        new OA\Property(property: 'expires_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'is_valid', type: 'boolean'),
        new OA\Property(property: 'is_authenticated', type: 'boolean'),
        new OA\Property(property: 'is_self_invitation', type: 'boolean', nullable: true),
        new OA\Property(property: 'already_has_access', type: 'boolean', nullable: true),
        new OA\Property(property: 'already_has_invited_role', type: 'boolean', nullable: true),
        new OA\Property(
            property: 'inviter',
            required: ['name'],
            properties: [
                new OA\Property(property: 'name', type: 'string'),
            ],
            type: 'object'
        ),
        new OA\Property(
            property: 'target',
            required: ['name', 'role'],
            properties: [
                new OA\Property(property: 'name', type: 'string'),
                new OA\Property(property: 'thumbnail', type: 'string', nullable: true),
                new OA\Property(
                    property: 'pet_type',
                    properties: [
                        new OA\Property(property: 'name', type: 'string'),
                    ],
                    type: 'object',
                    nullable: true
                ),
                new OA\Property(
                    property: 'role',
                    type: 'string',
                    enum: ['owner', 'editor', 'viewer']
                ),
            ],
            type: 'object'
        ),
    ],
    type: 'object'
)]
#[OA\Schema(
    schema: 'GroupResourceInvitationPreview',
    required: ['type', 'status', 'expires_at', 'is_valid', 'is_authenticated', 'inviter', 'target'],
    properties: [
        new OA\Property(property: 'type', type: 'string', enum: ['group']),
        new OA\Property(
            property: 'status',
            type: 'string',
            enum: ['pending', 'accepted', 'declined', 'revoked', 'expired']
        ),
        new OA\Property(property: 'expires_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'is_valid', type: 'boolean'),
        new OA\Property(property: 'is_authenticated', type: 'boolean'),
        new OA\Property(property: 'is_self_invitation', type: 'boolean', nullable: true),
        new OA\Property(property: 'already_has_access', type: 'boolean', nullable: true),
        new OA\Property(property: 'already_has_invited_role', type: 'boolean', nullable: true),
        new OA\Property(
            property: 'inviter',
            required: ['name'],
            properties: [
                new OA\Property(property: 'name', type: 'string'),
            ],
            type: 'object'
        ),
        new OA\Property(
            property: 'target',
            required: ['name', 'role'],
            properties: [
                new OA\Property(property: 'name', type: 'string'),
                new OA\Property(
                    property: 'role',
                    type: 'string',
                    enum: ['admin', 'member']
                ),
            ],
            type: 'object'
        ),
    ],
    type: 'object'
)]
#[OA\Schema(
    schema: 'LedgerResourceInvitationPreview',
    required: ['type', 'status', 'expires_at', 'is_valid', 'is_authenticated', 'inviter', 'target'],
    properties: [
        new OA\Property(property: 'type', type: 'string', enum: ['ledger']),
        new OA\Property(property: 'status', type: 'string', enum: ['pending', 'accepted', 'declined', 'revoked', 'expired']),
        new OA\Property(property: 'expires_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'is_valid', type: 'boolean'),
        new OA\Property(property: 'is_authenticated', type: 'boolean'),
        new OA\Property(property: 'is_self_invitation', type: 'boolean', nullable: true),
        new OA\Property(property: 'already_has_access', type: 'boolean', nullable: true),
        new OA\Property(property: 'already_has_invited_role', type: 'boolean', nullable: true),
        new OA\Property(property: 'inviter', required: ['name'], properties: [new OA\Property(property: 'name', type: 'string')], type: 'object'),
        new OA\Property(property: 'target', required: ['name', 'role', 'currency_code'], properties: [
            new OA\Property(property: 'name', type: 'string'),
            new OA\Property(property: 'role', type: 'string', enum: ['member']),
            new OA\Property(property: 'currency_code', type: 'string', minLength: 3, maxLength: 3),
        ], type: 'object'),
    ],
    type: 'object'
)]
#[OA\Schema(
    schema: 'ManagedPetResourceInvitation',
    required: [
        'id',
        'type',
        'token',
        'status',
        'expires_at',
        'created_at',
        'updated_at',
        'invited_by_user_id',
        'invitation_url',
        'pet_id',
        'relationship_type',
    ],
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'type', type: 'string', enum: ['pet']),
        new OA\Property(property: 'token', type: 'string', minLength: 64, maxLength: 64),
        new OA\Property(
            property: 'status',
            type: 'string',
            enum: ['pending', 'accepted', 'declined', 'revoked', 'expired']
        ),
        new OA\Property(property: 'expires_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'invited_by_user_id', type: 'integer'),
        new OA\Property(property: 'invitation_url', type: 'string', format: 'uri'),
        new OA\Property(property: 'pet_id', type: 'integer'),
        new OA\Property(
            property: 'relationship_type',
            type: 'string',
            enum: ['owner', 'editor', 'viewer']
        ),
        new OA\Property(
            property: 'inviter',
            properties: [
                new OA\Property(property: 'id', type: 'integer'),
                new OA\Property(property: 'name', type: 'string'),
            ],
            type: 'object',
            nullable: true
        ),
    ],
    type: 'object'
)]
#[OA\Schema(
    schema: 'ManagedGroupResourceInvitation',
    required: [
        'id',
        'type',
        'token',
        'status',
        'expires_at',
        'created_at',
        'updated_at',
        'invited_by_user_id',
        'invitation_url',
        'group_id',
        'role',
    ],
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'type', type: 'string', enum: ['group']),
        new OA\Property(property: 'token', type: 'string', minLength: 64, maxLength: 64),
        new OA\Property(
            property: 'status',
            type: 'string',
            enum: ['pending', 'accepted', 'declined', 'revoked', 'expired']
        ),
        new OA\Property(property: 'expires_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'invited_by_user_id', type: 'integer'),
        new OA\Property(property: 'invitation_url', type: 'string', format: 'uri'),
        new OA\Property(property: 'group_id', type: 'integer'),
        new OA\Property(
            property: 'role',
            type: 'string',
            enum: ['admin', 'member']
        ),
        new OA\Property(
            property: 'inviter',
            properties: [
                new OA\Property(property: 'id', type: 'integer'),
                new OA\Property(property: 'name', type: 'string'),
            ],
            type: 'object',
            nullable: true
        ),
    ],
    type: 'object'
)]
#[OA\Schema(
    schema: 'CreatePetResourceInvitationPayload',
    required: ['invitation', 'invitation_url'],
    properties: [
        new OA\Property(property: 'invitation', ref: '#/components/schemas/ManagedPetResourceInvitation'),
        new OA\Property(property: 'invitation_url', type: 'string', format: 'uri'),
    ],
    type: 'object'
)]
#[OA\Schema(
    schema: 'CreateGroupResourceInvitationPayload',
    required: ['invitation', 'invitation_url'],
    properties: [
        new OA\Property(property: 'invitation', ref: '#/components/schemas/ManagedGroupResourceInvitation'),
        new OA\Property(property: 'invitation_url', type: 'string', format: 'uri'),
    ],
    type: 'object'
)]
#[OA\Schema(
    schema: 'AcceptResourceInvitationPayload',
    discriminator: new OA\Discriminator(
        propertyName: 'type',
        mapping: [
            'pet' => '#/components/schemas/AcceptPetResourceInvitationPayload',
            'group' => '#/components/schemas/AcceptGroupResourceInvitationPayload',
            'ledger' => '#/components/schemas/AcceptLedgerResourceInvitationPayload',
        ]
    ),
    oneOf: [
        new OA\Schema(ref: '#/components/schemas/AcceptPetResourceInvitationPayload'),
        new OA\Schema(ref: '#/components/schemas/AcceptGroupResourceInvitationPayload'),
        new OA\Schema(ref: '#/components/schemas/AcceptLedgerResourceInvitationPayload'),
    ]
)]
#[OA\Schema(
    schema: 'AcceptPetResourceInvitationPayload',
    required: ['type', 'pet_id', 'relationship_type', 'destination'],
    properties: [
        new OA\Property(property: 'type', type: 'string', enum: ['pet']),
        new OA\Property(property: 'pet_id', type: 'integer'),
        new OA\Property(
            property: 'relationship_type',
            type: 'string',
            enum: ['owner', 'editor', 'viewer']
        ),
        new OA\Property(property: 'destination', type: 'string', example: '/pets/123'),
    ],
    type: 'object'
)]
#[OA\Schema(
    schema: 'AcceptGroupResourceInvitationPayload',
    required: ['type', 'group_id', 'role', 'destination'],
    properties: [
        new OA\Property(property: 'type', type: 'string', enum: ['group']),
        new OA\Property(property: 'group_id', type: 'integer'),
        new OA\Property(
            property: 'role',
            type: 'string',
            enum: ['admin', 'member']
        ),
        new OA\Property(property: 'destination', type: 'string', example: '/groups/123'),
    ],
    type: 'object'
)]
#[OA\Schema(
    schema: 'AcceptLedgerResourceInvitationPayload',
    required: ['type', 'ledger_id', 'destination'],
    properties: [
        new OA\Property(property: 'type', type: 'string', enum: ['ledger']),
        new OA\Property(property: 'ledger_id', type: 'integer'),
        new OA\Property(property: 'destination', type: 'string', example: '/finance'),
    ],
    type: 'object'
)]
class ResourceInvitationSchemas {}
