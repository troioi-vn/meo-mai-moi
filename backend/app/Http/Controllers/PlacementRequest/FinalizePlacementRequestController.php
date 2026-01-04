<?php

namespace App\Http\Controllers\PlacementRequest;

use App\Enums\NotificationType;
use App\Enums\PetRelationshipType;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\TransferRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\PlacementRequest;
use App\Services\NotificationService;
use App\Services\PetRelationshipService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Post(
 *     path="/api/placement-requests/{id}/finalize",
 *     summary="Finalize an active placement request (mark pet as returned for temporary fostering)",
 *     tags={"Placement Requests"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="ID of the placement request to finalize",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Placement request finalized successfully",
 *
 *         @OA\JsonContent(ref="#/components/schemas/PlacementRequest")
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden - Only owner can finalize"
 *     ),
 *     @OA\Response(
 *         response=409,
 *         description="Conflict - Placement request is not in active status"
 *     )
 * )
 */
class FinalizePlacementRequestController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService,
        protected PetRelationshipService $petRelationshipService
    ) {}

    public function __invoke(Request $request, PlacementRequest $placementRequest)
    {
        $user = $request->user();

        /** @var \App\Models\Pet $pet */
        $pet = $placementRequest->pet;
        if (! $user instanceof \App\Models\User || ! $pet->isOwnedBy($user)) {
            return $this->sendError('Only the pet owner can finalize this placement request.', 403);
        }

        // Can only finalize active placement requests (temporary fostering)
        if ($placementRequest->status !== PlacementRequestStatus::ACTIVE) {
            return $this->sendError('Only active placement requests can be finalized.', 409);
        }

        // Should only be for temporary types
        $isTemporary = in_array($placementRequest->request_type, [
            PlacementRequestType::FOSTER_FREE,
            PlacementRequestType::FOSTER_PAID,
            PlacementRequestType::PET_SITTING,
        ], true);

        if (! $isTemporary) {
            return $this->sendError('Only temporary placements can be finalized this way.', 409);
        }

        DB::transaction(function () use ($placementRequest) {
            // Update placement request status to finalized
            $placementRequest->status = PlacementRequestStatus::FINALIZED;
            $placementRequest->save();

            // Find the helper who was assigned
            $helperUser = null;
            if ($placementRequest->request_type === PlacementRequestType::PET_SITTING) {
                $acceptedResponse = $placementRequest->responses()
                    ->where('status', \App\Enums\PlacementResponseStatus::ACCEPTED)
                    ->first();
                if ($acceptedResponse) {
                    $helperUser = $acceptedResponse->helperProfile->user;
                }
            } else {
                $confirmedTransfer = $placementRequest->transferRequests()
                    ->where('status', TransferRequestStatus::CONFIRMED)
                    ->latest('confirmed_at')
                    ->first();
                if ($confirmedTransfer) {
                    $helperUser = $confirmedTransfer->toUser;
                }
            }

            if ($helperUser) {
                // End the active placement relationship for the helper (sitter or foster)
                $this->petRelationshipService->endActiveRelationshipsByTypes(
                    $helperUser,
                    $placementRequest->pet,
                    [PetRelationshipType::FOSTER, PetRelationshipType::SITTER]
                );

                // Notify helper that the placement has ended
                $this->notificationService->send(
                    $helperUser,
                    NotificationType::PLACEMENT_ENDED->value,
                    [
                        'message' => 'The placement for '.$placementRequest->pet->name.' has ended. Thank you for your help!',
                        'link' => '/pets/'.$placementRequest->pet_id.'/view',
                        'pet_name' => $placementRequest->pet->name,
                        'pet_id' => $placementRequest->pet_id,
                    ]
                );
            }
        });

        return $this->sendSuccess($placementRequest->fresh());
    }
}
