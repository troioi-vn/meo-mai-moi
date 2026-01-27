<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

/**
 * These schemas provide standard envelopes for API responses.
 * Since OpenAPI 3.0 does not support generics, we define common response shapes here.
 */
#[OA\Schema(
    schema: 'ApiErrorResponse',
    title: 'API Error Response',
    properties: [
        new OA\Property(property: 'error', type: 'string', example: 'Something went wrong'),
    ]
)]
#[OA\Schema(
    schema: 'ApiErrorMessageResponse',
    title: 'API Error Message Response',
    properties: [
        new OA\Property(property: 'success', type: 'boolean', example: false),
        new OA\Property(property: 'message', type: 'string', example: 'Something went wrong'),
        new OA\Property(property: 'error', type: 'string', example: 'Something went wrong'),
    ]
)]
#[OA\Schema(
    schema: 'ApiMessageResponse',
    title: 'API Message Response',
    properties: [
        new OA\Property(property: 'success', type: 'boolean', example: true),
        new OA\Property(property: 'message', type: 'string', example: 'Operation successful'),
    ]
)]
#[OA\Schema(
    schema: 'ApiSuccessMessageResponse',
    title: 'API Success Message Response',
    properties: [
        new OA\Property(property: 'success', type: 'boolean', example: true),
        new OA\Property(property: 'data', type: 'null', nullable: true),
        new OA\Property(property: 'message', type: 'string', example: 'Operation successful'),
    ]
)]
#[OA\Schema(
    schema: 'ApiEmptyDataResponse',
    title: 'API Empty Data Response',
    properties: [
        new OA\Property(
            property: 'data',
            type: 'array',
            items: new OA\Items(type: 'object')
        ),
    ]
)]
#[OA\Schema(
    schema: 'PetResponse',
    title: 'Pet Response',
    properties: [
        new OA\Property(property: 'data', ref: '#/components/schemas/Pet'),
    ]
)]
#[OA\Schema(
    schema: 'PetTypeArrayResponse',
    title: 'Pet Type Array Response',
    properties: [
        new OA\Property(
            property: 'data',
            type: 'array',
            items: new OA\Items(
                type: 'object',
                properties: [
                    new OA\Property(property: 'id', type: 'integer', example: 1),
                    new OA\Property(property: 'name', type: 'string', example: 'Cat'),
                    new OA\Property(property: 'slug', type: 'string', example: 'cat'),
                    new OA\Property(property: 'description', type: 'string', example: 'Feline companions'),
                ]
            )
        ),
    ]
)]
#[OA\Schema(
    schema: 'PetArrayResponse',
    title: 'Pet Array Response',
    properties: [
        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Pet')),
    ]
)]
#[OA\Schema(
    schema: 'PetSectionsResponse',
    title: 'Pet Sections Response',
    properties: [
        new OA\Property(
            property: 'data',
            type: 'object',
            properties: [
                new OA\Property(property: 'owned', type: 'array', items: new OA\Items(ref: '#/components/schemas/Pet')),
                new OA\Property(property: 'fostering_active', type: 'array', items: new OA\Items(ref: '#/components/schemas/Pet')),
                new OA\Property(property: 'fostering_past', type: 'array', items: new OA\Items(ref: '#/components/schemas/Pet')),
                new OA\Property(property: 'transferred_away', type: 'array', items: new OA\Items(ref: '#/components/schemas/Pet')),
            ]
        ),
    ]
)]
#[OA\Schema(
    schema: 'PublicPetResponse',
    title: 'Public Pet Response',
    properties: [
        new OA\Property(
            property: 'data',
            type: 'object',
            properties: [
                new OA\Property(property: 'id', type: 'integer'),
                new OA\Property(property: 'name', type: 'string'),
                new OA\Property(property: 'sex', type: 'string'),
                new OA\Property(property: 'birthday_precision', type: 'string'),
                new OA\Property(property: 'birthday_year', type: 'integer', nullable: true),
                new OA\Property(property: 'birthday_month', type: 'integer', nullable: true),
                new OA\Property(property: 'birthday_day', type: 'integer', nullable: true),
                new OA\Property(property: 'country', type: 'string'),
                new OA\Property(property: 'state', type: 'string', nullable: true),
                new OA\Property(property: 'city', type: 'string', nullable: true),
                new OA\Property(property: 'description', type: 'string'),
                new OA\Property(property: 'status', type: 'string'),
                new OA\Property(property: 'pet_type_id', type: 'integer'),
                new OA\Property(property: 'photo_url', type: 'string', nullable: true),
                new OA\Property(property: 'photos', type: 'array', items: new OA\Items(type: 'object')),
                new OA\Property(property: 'pet_type', type: 'object'),
                new OA\Property(property: 'categories', type: 'array', items: new OA\Items(type: 'object')),
                new OA\Property(property: 'placement_requests', type: 'array', items: new OA\Items(type: 'object')),
                new OA\Property(
                    property: 'viewer_permissions',
                    type: 'object',
                    properties: [
                        new OA\Property(property: 'is_owner', type: 'boolean'),
                    ]
                ),
            ]
        ),
    ]
)]
#[OA\Schema(
    schema: 'UserResponse',
    title: 'User Response',
    properties: [
        new OA\Property(property: 'data', ref: '#/components/schemas/User'),
    ]
)]
#[OA\Schema(
    schema: 'CategoryArrayResponse',
    title: 'Category Array Response',
    properties: [
        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Category')),
    ]
)]
#[OA\Schema(
    schema: 'CategoryResponse',
    title: 'Category Response',
    properties: [
        new OA\Property(property: 'data', ref: '#/components/schemas/Category'),
    ]
)]
#[OA\Schema(
    schema: 'HelperProfileResponse',
    title: 'Helper Profile Response',
    properties: [
        new OA\Property(property: 'data', ref: '#/components/schemas/HelperProfile'),
    ]
)]
#[OA\Schema(
    schema: 'HelperProfileArrayResponse',
    title: 'Helper Profile Array Response',
    properties: [
        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/HelperProfile')),
    ]
)]
#[OA\Schema(
    schema: 'PlacementRequestResponse_Schema',
    title: 'Placement Request Response Envelope',
    properties: [
        new OA\Property(property: 'data', ref: '#/components/schemas/PlacementRequest'),
    ]
)]
#[OA\Schema(
    schema: 'TransferRequestResponse',
    title: 'Transfer Request Response',
    properties: [
        new OA\Property(property: 'data', ref: '#/components/schemas/TransferRequest'),
    ]
)]
#[OA\Schema(
    schema: 'MessageResponse',
    title: 'Message Response',
    properties: [
        new OA\Property(property: 'data', ref: '#/components/schemas/Message'),
    ]
)]
#[OA\Schema(
    schema: 'MessageArrayResponse',
    title: 'Message Array Response',
    properties: [
        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Message')),
    ]
)]
#[OA\Schema(
    schema: 'WeightHistoryArrayResponse',
    title: 'Weight History Array Response',
    properties: [
        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/WeightHistory')),
    ]
)]
#[OA\Schema(
    schema: 'MedicalNoteArrayResponse',
    title: 'Medical Note Array Response',
    properties: [
        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/MedicalNote')),
    ]
)]
#[OA\Schema(
    schema: 'VaccinationRecordArrayResponse',
    title: 'Vaccination Record Array Response',
    properties: [
        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/VaccinationRecord')),
    ]
)]
#[OA\Schema(
    schema: 'EmailExistsResponse',
    title: 'Email Exists Response',
    properties: [
        new OA\Property(
            property: 'data',
            type: 'object',
            properties: [
                new OA\Property(property: 'exists', type: 'boolean', example: true),
            ]
        ),
    ]
)]
#[OA\Schema(
    schema: 'VerificationStatusResponse',
    title: 'Verification Status Response',
    properties: [
        new OA\Property(
            property: 'data',
            type: 'object',
            properties: [
                new OA\Property(property: 'verified', type: 'boolean', example: true),
                new OA\Property(property: 'email', type: 'string', example: 'user@example.com'),
            ]
        ),
    ]
)]
#[OA\Schema(
    schema: 'EmailConfigurationStatusResponse',
    title: 'Email Configuration Status Response',
    properties: [
        new OA\Property(
            property: 'data',
            type: 'object',
            properties: [
                new OA\Property(property: 'enabled', type: 'boolean', example: true),
                new OA\Property(property: 'provider', type: 'string', nullable: true, example: 'smtp'),
                new OA\Property(property: 'from_address', type: 'string', nullable: true, example: 'noreply@example.com'),
                new OA\Property(property: 'status', type: 'string', example: 'active'),
            ]
        ),
    ]
)]
#[OA\Schema(
    schema: 'VerificationNotificationResponse',
    title: 'Verification Notification Response',
    properties: [
        new OA\Property(
            property: 'data',
            type: 'object',
            properties: [
                new OA\Property(property: 'message', type: 'string', example: 'Verification email sent'),
                new OA\Property(property: 'email_sent', type: 'boolean', example: true),
            ]
        ),
    ]
)]
#[OA\Schema(
    schema: 'EmailVerificationResponse',
    title: 'Email Verification Response',
    properties: [
        new OA\Property(
            property: 'data',
            type: 'object',
            properties: [
                new OA\Property(property: 'message', type: 'string', example: 'Email verified successfully'),
                new OA\Property(property: 'verified', type: 'boolean', example: true),
            ]
        ),
    ]
)]
#[OA\Schema(
    schema: 'VersionResponse',
    title: 'Version Response',
    properties: [
        new OA\Property(
            property: 'data',
            type: 'object',
            properties: [
                new OA\Property(property: 'version', type: 'string', example: 'v1.0.0'),
            ]
        ),
    ]
)]
#[OA\Schema(
    schema: 'ImpersonationStatusResponse',
    title: 'Impersonation Status Response',
    properties: [
        new OA\Property(
            property: 'data',
            type: 'object',
            properties: [
                new OA\Property(property: 'is_impersonating', type: 'boolean', example: true),
                new OA\Property(
                    property: 'impersonator',
                    type: 'object',
                    nullable: true,
                    properties: [
                        new OA\Property(property: 'id', type: 'integer', example: 1),
                        new OA\Property(property: 'name', type: 'string', example: 'Admin User'),
                        new OA\Property(property: 'can_access_admin', type: 'boolean', example: true),
                    ]
                ),
                new OA\Property(
                    property: 'impersonated_user',
                    type: 'object',
                    nullable: true,
                    properties: [
                        new OA\Property(property: 'id', type: 'integer', example: 2),
                        new OA\Property(property: 'name', type: 'string', example: 'Impersonated User'),
                    ]
                ),
            ]
        ),
    ]
)]
#[OA\Schema(
    schema: 'UnifiedNotificationsResponse',
    title: 'Unified Notifications Response',
    properties: [
        new OA\Property(
            property: 'data',
            type: 'object',
            properties: [
                new OA\Property(
                    property: 'bell_notifications',
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/AppNotification')
                ),
                new OA\Property(property: 'unread_bell_count', type: 'integer', example: 5),
                new OA\Property(property: 'unread_message_count', type: 'integer', example: 2),
            ]
        ),
    ]
)]
class ResponseSchemas {}
