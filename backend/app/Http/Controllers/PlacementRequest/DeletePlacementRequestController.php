<?php

namespace App\Http\Controllers\PlacementRequest;

use App\Http\Controllers\Controller;
use App\Models\PlacementRequest;
use App\Traits\ApiResponseTrait;

/**
 * @OA\Delete(
 *     path="/api/placement-requests/{id}",
 *     summary="Delete a placement request",
 *     tags={"Placement Requests"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="ID of the placement request to delete",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\Response(
 *         response=204,
 *         description="Placement request deleted successfully"
 *     ),
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden"
 *     )
 * )
 */
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
