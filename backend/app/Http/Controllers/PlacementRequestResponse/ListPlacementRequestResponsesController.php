<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementRequestResponse;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlacementRequestResponseResource;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/placement-requests/{id}/responses',
    summary: 'List responses for a placement request',
    tags: ['Placement Request Responses'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the placement request',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'List of responses',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/PlacementRequestResponse')),
                    new OA\Property(property: 'message', type: 'string', example: 'Responses retrieved successfully.'),
                ]
            )
        ),
        new OA\Response(
            response: 403,
            description: 'Forbidden - Not authorized to view responses'
        ),
        new OA\Response(
            response: 404,
            description: 'Placement request not found'
        ),
    ]
)]
class ListPlacementRequestResponsesController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, int $placementRequestId)
    {
        $placementRequest = PlacementRequest::findOrFail($placementRequestId);

        // Only the owner or admin can see all responses
        // Helpers can only see their own response (handled by policy if we were viewing a single response)
        // For listing, we should probably restrict this to the owner.
        if ($placementRequest->user_id !== $request->user()->id && ! $request->user()->hasRole('admin')) {
            return $this->sendError(__('messages.placement.unauthorized_view_responses'), 403);
        }

        // Helpers can cancel and re-respond, which creates multiple rows per helper.
        // For UI purposes we only want the latest response per helper profile.
        $latestResponseIds = PlacementRequestResponse::query()
            ->selectRaw('MAX(id)')
            ->where('placement_request_id', $placementRequest->id)
            ->groupBy('helper_profile_id');

        $responses = $placementRequest->responses()
            ->whereIn('id', $latestResponseIds)
            ->with('helperProfile.user')
            ->latest()
            ->get();

        return $this->sendSuccess(
            PlacementRequestResponseResource::collection($responses)
        );
    }
}
