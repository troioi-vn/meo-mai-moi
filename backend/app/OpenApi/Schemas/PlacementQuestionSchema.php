<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'PlacementQuestion',
    type: 'object',
    title: 'PlacementQuestion',
    description: 'A public question about a listed pet. The asker\'s email address and IP are never included in any response.',
    required: ['id', 'pet_id', 'asker_name', 'question', 'status'],
    properties: [
        new OA\Property(property: 'id', type: 'integer', example: 1),
        new OA\Property(property: 'pet_id', type: 'integer', example: 2),
        new OA\Property(property: 'placement_request_id', type: 'integer', nullable: true, example: 7),
        new OA\Property(property: 'asker_name', type: 'string', example: 'Linh'),
        new OA\Property(property: 'question', type: 'string', example: 'Is she good with other cats?'),
        new OA\Property(property: 'question_locale', type: 'string', nullable: true, example: 'en'),
        new OA\Property(property: 'answer', type: 'string', nullable: true, example: 'Yes, she shares with two others.'),
        new OA\Property(property: 'answer_locale', type: 'string', nullable: true, example: 'en'),
        new OA\Property(property: 'answered_by_name', type: 'string', nullable: true, description: 'Null once the pet changes owner, so a previous owner is no longer named on answers they can no longer correct.'),
        new OA\Property(property: 'answered_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'published_at', type: 'string', format: 'date-time', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        new OA\Property(property: 'is_answered', type: 'boolean', example: true),
        new OA\Property(property: 'status', type: 'string', enum: ['pending', 'published', 'hidden'], example: 'published'),
        new OA\Property(property: 'question_translation', ref: '#/components/schemas/ContentTranslation', nullable: true),
        new OA\Property(property: 'answer_translation', ref: '#/components/schemas/ContentTranslation', nullable: true),
        new OA\Property(property: 'machine_translated', type: 'boolean', description: 'True when the reader is being shown machine output nobody reviewed. The person who approved the pair could read only one of the four languages it publishes in.'),
        new OA\Property(property: 'translation_within_budget', type: 'boolean', description: 'False once a pet has more published pairs than the translation budget covers; the client should offer an on-demand translate control.'),
        new OA\Property(property: 'asker_email_confirmed', type: 'boolean', description: 'Only present for people who can manage the pet. The address itself is never returned.'),
        new OA\Property(property: 'hidden_at', type: 'string', format: 'date-time', nullable: true),
    ]
)]
class PlacementQuestionSchema {}
