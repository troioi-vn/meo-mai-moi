<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementRequest;

use App\Http\Controllers\Controller;
use App\Models\PlacementRequest;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
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

    public function __invoke(Request $request, PlacementRequest $placementRequest)
    {
        $user = $request->user();
        if (! $user instanceof User || $placementRequest->user_id !== $user->id) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $this->authorize('delete', $placementRequest);
        $placementRequest->delete();

        return $this->sendSuccess(null, 204);
    }
}
