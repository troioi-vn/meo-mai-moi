<?php

namespace App\Http\Controllers\PlacementRequest;

use App\Http\Controllers\Controller;
use App\Models\PlacementRequest;
use App\Traits\ApiResponseTrait;

/**
 * @OA\Post(
 *     path="/api/placement-requests/{id}/reject",
 *     summary="Reject a placement request",
 *     tags={"Placement Requests"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="ID of the placement request to reject",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Placement request rejected successfully",
 *
 *         @OA\JsonContent(ref="#/components/schemas/PlacementRequest")
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden"
 *     )
 * )
 */
class RejectPlacementRequestController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(PlacementRequest $placementRequest)
    {
        $this->authorize('reject', $placementRequest);

        // TODO: Add logic to reject the placement request
        return $this->sendSuccess($placementRequest);
    }
}
