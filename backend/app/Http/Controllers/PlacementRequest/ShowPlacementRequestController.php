<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementRequest;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlacementRequestResource;
use App\Models\PlacementRequest;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/placement-requests/{id}',
    summary: 'Get a placement request by ID',
    description: 'Returns placement request details. Access rules: Admin/owner can view any request. Helpers can view if they have responded, are part of a transfer, or have an active placement relationship. Anonymous users can view open requests (with limited data).',
    tags: ['Placement Requests'],
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
            description: 'Placement request details',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/PlacementRequest'),
                ]
            )
        ),
        new OA\Response(
            response: 403,
            description: 'Forbidden - Not authorized to view this placement request'
        ),
        new OA\Response(
            response: 404,
            description: 'Placement request not found'
        ),
    ]
)]
class ShowPlacementRequestController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, PlacementRequest $placementRequest)
    {
        // Authorization is handled by the policy
        $this->authorize('view', $placementRequest);

        // Eager load relationships for efficient queries
        $placementRequest->load([
            'pet.petType',
            'pet.city',
            'user',
            'responses.helperProfile.user',
            'responses.transferRequest',
            'transferRequests',
        ]);

        return $this->sendSuccess(new PlacementRequestResource($placementRequest));
    }
}
