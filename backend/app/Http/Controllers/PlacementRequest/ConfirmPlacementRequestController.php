<?php

namespace App\Http\Controllers\PlacementRequest;

use App\Http\Controllers\Controller;
use App\Models\PlacementRequest;
use App\Traits\ApiResponseTrait;

/**
 * @OA\Post(
 *     path="/api/placement-requests/{id}/confirm",
 *     summary="Confirm a placement request",
 *     tags={"Placement Requests"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="ID of the placement request to confirm",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Placement request confirmed successfully",
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
class ConfirmPlacementRequestController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(PlacementRequest $placementRequest)
    {
        $this->authorize('confirm', $placementRequest);

        // TODO: Add logic to confirm the placement request
        return $this->sendSuccess($placementRequest);
    }
}
