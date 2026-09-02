<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementRequestResponse;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlacementRequestResponseResource;
use App\Models\PlacementRequestResponse;
use App\Services\PlacementResponseLifecycleService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/placement-responses/{id}/accept',
    summary: 'Accept a response to a placement request',
    tags: ['Placement Request Responses'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the placement response',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Response accepted successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(property: 'data', ref: '#/components/schemas/PlacementRequestResponse'),
                    new OA\Property(property: 'message', type: 'string', example: 'Response accepted successfully.'),
                ]
            )
        ),
        new OA\Response(
            response: 403,
            description: 'Forbidden - Not authorized or invalid state transition'
        ),
        new OA\Response(
            response: 404,
            description: 'Placement response not found'
        ),
    ]
)]
class AcceptPlacementRequestResponseController extends Controller
{
    use ApiResponseTrait;
    use HandlesOfflineVersionChecks;

    public function __construct(
        protected PlacementResponseLifecycleService $lifecycleService
    ) {}

    public function __invoke(Request $request, int $id): JsonResponse
    {
        $response = PlacementRequestResponse::findOrFail($id);
        $this->authorize('accept', $response);
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $response)) {
            return $conflict;
        }

        if ($this->lifecycleService->accept($response)) {
            return $this->sendSuccess(
                new PlacementRequestResponseResource($response)
            );
        }

        return $this->sendError(__('messages.placement.response_cannot_accept'), 403);
    }
}
