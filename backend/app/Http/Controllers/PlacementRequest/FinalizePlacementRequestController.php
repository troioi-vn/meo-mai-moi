<?php

namespace App\Http\Controllers\PlacementRequest;

use App\Enums\PetRelationshipType;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Http\Controllers\Controller;
use App\Models\FosterAssignment;
use App\Models\Notification;
use App\Models\PetRelationship;
use App\Models\PlacementRequest;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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

    public function __invoke(Request $request, PlacementRequest $placementRequest)
    {
        $user = $request->user();

        // Only the pet owner can finalize
        $pet = $placementRequest->pet;
        if (! $pet->isOwnedBy($user)) {
            return $this->sendError('Only the pet owner can finalize this placement request.', 403);
        }

        // Can only finalize active placement requests (temporary fostering)
        if ($placementRequest->status !== PlacementRequestStatus::ACTIVE) {
            return $this->sendError('Only active placement requests can be finalized.', 409);
        }

        // Should only be for fostering types
        $isFostering = in_array($placementRequest->request_type, [
            PlacementRequestType::FOSTER_FREE,
            PlacementRequestType::FOSTER_PAYED,
        ], true);

        if (! $isFostering) {
            return $this->sendError('Only temporary fostering placements can be finalized this way.', 409);
        }

        DB::transaction(function () use ($placementRequest) {
            // Update placement request status to finalized
            $placementRequest->status = PlacementRequestStatus::FINALIZED;
            $placementRequest->save();

            // End any active foster assignment
            if (Schema::hasTable('foster_assignments')) {
                FosterAssignment::where('pet_id', $placementRequest->pet_id)
                    ->where('owner_user_id', $placementRequest->user_id)
                    ->where('status', 'active')
                    ->update([
                        'status' => 'completed',
                        'actual_end_date' => now()->toDateString(),
                    ]);
            }

            // Also end the foster relationship
            PetRelationship::where('pet_id', $placementRequest->pet_id)
                ->where('relationship_type', PetRelationshipType::FOSTER)
                ->whereNull('end_at')
                ->update(['end_at' => now()]);

            // Find the accepted transfer request to notify the helper
            $acceptedTransfer = $placementRequest->transferRequests()
                ->where('status', 'accepted')
                ->first();

            if ($acceptedTransfer) {
                // Notify helper that fostering has ended
                Notification::create([
                    'user_id' => $acceptedTransfer->initiator_user_id,
                    'message' => 'The pet has been returned and the fostering period has ended.',
                    'link' => '/pets/'.$placementRequest->pet_id,
                ]);
            }
        });

        return $this->sendSuccess($placementRequest->fresh());
    }
}
