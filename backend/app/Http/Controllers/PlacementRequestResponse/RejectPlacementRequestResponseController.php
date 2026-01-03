<?php

namespace App\Http\Controllers\PlacementRequestResponse;

use App\Enums\NotificationType;
use App\Http\Controllers\Controller;
use App\Http\Resources\PlacementRequestResponseResource;
use App\Models\PlacementRequestResponse;
use App\Services\NotificationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Post(
 *     path="/api/placement-responses/{id}/reject",
 *     summary="Reject a response to a placement request",
 *     tags={"Placement Request Responses"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="ID of the placement response",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Response rejected successfully",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="success", type="boolean", example=true),
 *             @OA\Property(property="data", ref="#/components/schemas/PlacementRequestResponse"),
 *             @OA\Property(property="message", type="string", example="Response rejected successfully.")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden - Not authorized or invalid state transition"
 *     ),
 *     @OA\Response(
 *         response=404,
 *         description="Placement response not found"
 *     )
 * )
 */
class RejectPlacementRequestResponseController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService
    ) {}

    public function __invoke(Request $request, int $id)
    {
        $response = PlacementRequestResponse::findOrFail($id);

        $this->authorize('reject', $response);

        if ($response->reject()) {
            // Send notification to helper
            $pet = $response->placementRequest->pet;
            $this->notificationService->send(
                $response->helperProfile->user,
                NotificationType::HELPER_RESPONSE_REJECTED->value,
                [
                    'message' => 'Your offer to help with '.$pet->name.' was declined. Thank you for reaching out!',
                    'link' => '/pets/'.$pet->id.'/public',
                    'pet_name' => $pet->name,
                    'pet_id' => $pet->id,
                    'placement_response_id' => $response->id,
                ]
            );

            return $this->sendSuccess(
                new PlacementRequestResponseResource($response)
            );
        }

        return $this->sendError('This response cannot be rejected in its current state.', 403);
    }
}
