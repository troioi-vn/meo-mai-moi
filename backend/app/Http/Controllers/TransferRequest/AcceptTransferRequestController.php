<?php

namespace App\Http\Controllers\TransferRequest;

use App\Enums\NotificationType;
use App\Enums\PlacementRequestStatus;
use App\Enums\TransferRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\TransferHandover;
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\NotificationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * @OA\Post(
 *     path="/api/transfer-requests/{id}/accept",
 *     summary="Accept a transfer request for a pet",
 *     tags={"Transfer Requests"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="ID of the transfer request to accept",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Transfer request accepted successfully",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="data", ref="#/components/schemas/TransferRequest")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Transfer request not found"
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     ),
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden: You are not the recipient of this request or the request is not pending."
 *     )
 * )
 */
class AcceptTransferRequestController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService
    ) {
    }

    public function __invoke(Request $request, TransferRequest $transferRequest)
    {
        $this->authorize('accept', $transferRequest);

        // Ensure pending before proceeding
        if ($transferRequest->status !== TransferRequestStatus::PENDING) {
            return $this->sendError('Only pending requests can be accepted.', 409);
        }

        DB::transaction(function () use ($transferRequest) {
            $transferRequest->status = TransferRequestStatus::ACCEPTED;
            $transferRequest->accepted_at = now();
            $transferRequest->save();

            $placement = $transferRequest->placementRequest;

            if ($placement) {
                // Fulfill the placement request
                $placement->markAsFulfilled();
                // If status enum supports it, set to fulfilled
                if (in_array('status', $placement->getFillable(), true)) {
                    $placement->status = PlacementRequestStatus::FULFILLED;
                }
                if (Schema::hasColumn('placement_requests', 'fulfilled_at')) {
                    $placement->fulfilled_at = now();
                }
                if (Schema::hasColumn('placement_requests', 'fulfilled_by_transfer_request_id')) {
                    $placement->fulfilled_by_transfer_request_id = $transferRequest->id;
                }
                $placement->save();

                // Note: Other pending transfer requests are auto-rejected when the handover
                // is completed and the placement status changes to ACTIVE or FINALIZED.
                // See CompleteHandoverController for that logic.
            }

            // Create initial handover record; finalization occurs on handover completion
            if (class_exists(TransferHandover::class) && Schema::hasTable('transfer_handovers')) {
                TransferHandover::create([
                    'transfer_request_id' => $transferRequest->id,
                    'owner_user_id' => $transferRequest->recipient_user_id,
                    'helper_user_id' => $transferRequest->initiator_user_id,
                    'status' => 'pending',
                    'owner_initiated_at' => now(),
                ]);
            }
        });

        // Notify helper (initiator) on acceptance using NotificationService
        try {
            $pet = $transferRequest->pet ?: Pet::find($transferRequest->pet_id);
            if ($pet) {
                $helper = User::find($transferRequest->initiator_user_id);
                if ($helper) {
                    $this->notificationService->send(
                        $helper,
                        NotificationType::HELPER_RESPONSE_ACCEPTED->value,
                        [
                            'message' => 'Your request for '.$pet->name.' was accepted. Schedule a handover.',
                            'link' => '/pets/'.$pet->id,
                            'pet_name' => $pet->name,
                            'pet_id' => $pet->id,
                            'transfer_request_id' => $transferRequest->id,
                        ]
                    );
                }
            }
        } catch (\Throwable $e) {
            // non-fatal; log at debug level for auditability
            Log::debug('Failed to notify helper on acceptance', [
                'transfer_request_id' => $transferRequest->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $this->sendSuccess($transferRequest->fresh(['placementRequest']));
    }
}
