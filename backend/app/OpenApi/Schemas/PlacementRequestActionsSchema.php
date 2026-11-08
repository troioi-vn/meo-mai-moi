<?php

declare(strict_types=1);

namespace App\OpenApi\Schemas;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'PlacementRequestActions',
    type: 'object',
    required: ['can_respond', 'can_quick_respond', 'can_cancel_my_response', 'can_accept_responses', 'can_reject_responses', 'can_confirm_handover', 'can_finalize', 'can_delete_request', 'can_print_poster'],
    properties: [
        new OA\Property(property: 'can_respond', type: 'boolean'),
        new OA\Property(property: 'can_quick_respond', type: 'boolean'),
        new OA\Property(property: 'can_cancel_my_response', type: 'boolean'),
        new OA\Property(property: 'can_accept_responses', type: 'boolean'),
        new OA\Property(property: 'can_reject_responses', type: 'boolean'),
        new OA\Property(property: 'can_confirm_handover', type: 'boolean'),
        new OA\Property(property: 'can_finalize', type: 'boolean'),
        new OA\Property(property: 'can_delete_request', type: 'boolean'),
        new OA\Property(property: 'can_print_poster', type: 'boolean', description: 'Open listing and direct owner or active Group member; independent of viewer_role'),
    ],
)]
class PlacementRequestActionsSchema {}
