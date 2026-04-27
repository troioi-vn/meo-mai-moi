<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'HabitPetSummary',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'photo_url', type: 'string', nullable: true),
    ]
)]
#[OA\Schema(
    schema: 'HabitCapabilities',
    properties: [
        new OA\Property(property: 'can_edit', type: 'boolean'),
        new OA\Property(property: 'can_delete', type: 'boolean'),
        new OA\Property(property: 'can_archive', type: 'boolean'),
        new OA\Property(property: 'can_share', type: 'boolean'),
    ]
)]
#[OA\Schema(
    schema: 'Habit',
    properties: [
        new OA\Property(property: 'id', type: 'integer'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'value_type', type: 'string', enum: ['yes_no', 'integer_scale']),
        new OA\Property(property: 'scale_min', type: 'integer', nullable: true),
        new OA\Property(property: 'scale_max', type: 'integer', nullable: true),
        new OA\Property(property: 'day_summary_mode', type: 'string', enum: ['average_scored_pets', 'average_all_pets', 'sum']),
        new OA\Property(property: 'share_with_coowners', type: 'boolean'),
        new OA\Property(property: 'reminder_enabled', type: 'boolean'),
        new OA\Property(property: 'reminder_time', type: 'string', nullable: true, example: '20:00'),
        new OA\Property(
            property: 'reminder_weekdays',
            type: 'array',
            nullable: true,
            items: new OA\Items(type: 'integer', example: 1)
        ),
        new OA\Property(property: 'archived_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'pet_count', type: 'integer'),
        new OA\Property(
            property: 'pets',
            type: 'array',
            items: new OA\Items(ref: '#/components/schemas/HabitPetSummary')
        ),
        new OA\Property(
            property: 'capabilities',
            ref: '#/components/schemas/HabitCapabilities'
        ),
        new OA\Property(property: 'created_by', type: 'integer'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time'),
    ]
)]
#[OA\Schema(
    schema: 'HabitDaySummary',
    properties: [
        new OA\Property(property: 'date', type: 'string', format: 'date'),
        new OA\Property(property: 'average_value', type: 'number', format: 'float', nullable: true),
        new OA\Property(property: 'display_value', type: 'number', format: 'float', nullable: true),
        new OA\Property(property: 'entry_count', type: 'integer'),
        new OA\Property(property: 'visible_pet_count', type: 'integer'),
        new OA\Property(property: 'normalized_intensity', type: 'number', format: 'float', nullable: true),
    ]
)]
#[OA\Schema(
    schema: 'HabitDayEntry',
    properties: [
        new OA\Property(property: 'entry_id', type: 'integer', nullable: true),
        new OA\Property(property: 'pet_id', type: 'integer'),
        new OA\Property(property: 'pet_name', type: 'string'),
        new OA\Property(property: 'pet_photo_url', type: 'string', nullable: true),
        new OA\Property(property: 'value_int', type: 'integer', nullable: true),
        new OA\Property(property: 'is_current_pet', type: 'boolean'),
        new OA\Property(property: 'has_entry', type: 'boolean'),
    ]
)]
class HabitSchema {}
