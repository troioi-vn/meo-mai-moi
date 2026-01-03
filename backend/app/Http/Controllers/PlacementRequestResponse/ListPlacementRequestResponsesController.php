<?php

namespace App\Http\Controllers\PlacementRequestResponse;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlacementRequestResponseResource;
use App\Models\PlacementRequest;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/api/placement-requests/{id}/responses",
 *     summary="List responses for a placement request",
 *     tags={"Placement Request Responses"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="ID of the placement request",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="List of responses",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="success", type="boolean", example=true),
 *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/PlacementRequestResponse")),
 *             @OA\Property(property="message", type="string", example="Responses retrieved successfully.")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden - Not authorized to view responses"
 *     ),
 *     @OA\Response(
 *         response=404,
 *         description="Placement request not found"
 *     )
 * )
 */
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
            return $this->sendError('You are not authorized to view responses for this placement request.', 403);
        }

        $responses = $placementRequest->responses()
            ->with('helperProfile.user')
            ->latest()
            ->get();

        return $this->sendSuccess(
            PlacementRequestResponseResource::collection($responses)
        );
    }
}
