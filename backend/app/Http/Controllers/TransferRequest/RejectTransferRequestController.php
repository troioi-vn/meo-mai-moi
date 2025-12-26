<?php

namespace App\Http\Controllers\TransferRequest;

use App\Enums\NotificationType;
use App\Enums\TransferRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\NotificationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Post(
 *     path="/api/transfer-requests/{id}/reject",
 *     summary="Reject a transfer request for a pet",
 *     tags={"Transfer Requests"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="ID of the transfer request to reject",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Transfer request rejected successfully",
 *
 *         @OA\JsonContent(ref="#/components/schemas/TransferRequest")
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
class RejectTransferRequestController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService
    ) {}

    public function __invoke(Request $request, TransferRequest $transferRequest)
    {
        $this->authorize('reject', $transferRequest);

        // Ensure pending before proceeding to avoid duplicate notifications
        if ($transferRequest->status !== TransferRequestStatus::PENDING) {
            return $this->sendError('Only pending requests can be rejected.', 409);
        }

        $transferRequest->status = TransferRequestStatus::REJECTED;
        $transferRequest->rejected_at = now();
        $transferRequest->save();

        // Notify helper (initiator) on rejection using NotificationService
        try {
            $pet = $transferRequest->pet ?: Pet::find($transferRequest->pet_id);
            if ($pet instanceof Pet) {
                $helper = User::find($transferRequest->initiator_user_id);
                if ($helper) {
                    $this->notificationService->send(
                        $helper,
                        NotificationType::HELPER_RESPONSE_REJECTED->value,
                        [
                            'message' => 'Your request for '.$pet->name.' was rejected by the owner.',
                            'link' => '/pets/'.$pet->id,
                            'pet_name' => $pet->name,
                            'pet_id' => $pet->id,
                            'transfer_request_id' => $transferRequest->id,
                        ]
                    );
                }
            }
        } catch (\Throwable $e) {
            // Notification failure is non-fatal; log and continue
            \Log::debug('Failed to send transfer request rejection notification', ['error' => $e->getMessage()]);
        }

        return $this->sendSuccess($transferRequest);
    }
}
