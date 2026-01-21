<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementRequest;

use App\Http\Controllers\Controller;
use App\Models\PlacementRequest;
use App\Traits\ApiResponseTrait;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/api/placement-requests/{id}',
    summary: 'Delete a placement request',
    tags: ['Placement Requests'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the placement request to delete',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 204,
            description: 'Placement request deleted successfully'
        ),
        new OA\Response(
            response: 403,
            description: 'Forbidden'
        ),
    ]
)]
class DeletePlacementRequestController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(PlacementRequest $placementRequest)
    {
        $this->authorize('delete', $placementRequest);
        $placementRequest->delete();

        return $this->sendSuccess(null, 204);
    }
}
