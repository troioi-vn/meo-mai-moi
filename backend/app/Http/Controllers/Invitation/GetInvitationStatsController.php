<?php

declare(strict_types=1);

namespace App\Http\Controllers\Invitation;

use App\Http\Controllers\Controller;
use App\Services\InvitationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

/**
 * Get invitation statistics for the authenticated user
 */
class GetInvitationStatsController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private InvitationService $invitationService
    ) {}

    #[OA\Get(
        path: '/api/invitations/stats',
        summary: 'Get invitation statistics for the authenticated user',
        tags: ['Invitations'],
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Invitation statistics',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [
                        new OA\Property(property: 'data', properties: [
                            new OA\Property(property: 'total', type: 'integer'),
                            new OA\Property(property: 'pending', type: 'integer'),
                            new OA\Property(property: 'accepted', type: 'integer'),
                            new OA\Property(property: 'expired', type: 'integer'),
                            new OA\Property(property: 'revoked', type: 'integer'),
                        ], type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
        ]
    )]
    public function __invoke(Request $request)
    {
        $user = $request->user();
        $stats = $this->invitationService->getUserInvitationStats($user);

        return $this->sendSuccess($stats);
    }
}
