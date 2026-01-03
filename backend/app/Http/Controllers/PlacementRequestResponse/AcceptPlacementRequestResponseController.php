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
 *     path="/api/placement-responses/{id}/accept",
 *     summary="Accept a response to a placement request",
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
 *         description="Response accepted successfully",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="success", type="boolean", example=true),
 *             @OA\Property(property="data", ref="#/components/schemas/PlacementRequestResponse"),
 *             @OA\Property(property="message", type="string", example="Response accepted successfully.")
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
class AcceptPlacementRequestResponseController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService
    ) {}

    public function __invoke(Request $request, int $id)
    {
        $response = PlacementRequestResponse::findOrFail($id);

        $this->authorize('accept', $response);

        if ($response->accept()) {
            // Send notification to helper
            $pet = $response->placementRequest->pet;
            $placementType = $response->placementRequest->request_type->value;
            $needsHandover = in_array($placementType, ['permanent', 'foster_free', 'foster_paid']);

            $message = $needsHandover
                ? 'Great news! Your offer to help with '.$pet->name.' was accepted. Please confirm when you receive the pet.'
                : 'Great news! Your offer to help with '.$pet->name.' was accepted.';

            $this->notificationService->send(
                $response->helperProfile->user,
                NotificationType::HELPER_RESPONSE_ACCEPTED->value,
                [
                    'message' => $message,
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

        return $this->sendError('This response cannot be accepted in its current state.', 403);
    }
}
