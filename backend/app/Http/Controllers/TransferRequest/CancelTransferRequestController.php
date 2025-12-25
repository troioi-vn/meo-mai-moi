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
 * @OA\Delete(
 *     path="/api/transfer-requests/{id}",
 *     summary="Cancel a transfer request (by the initiator/helper)",
 *     tags={"Transfer Requests"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="ID of the transfer request to cancel",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Transfer request canceled successfully",
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
 *         description="Forbidden: You are not the initiator of this request."
 *     ),
 *     @OA\Response(
 *         response=409,
 *         description="Only pending requests can be canceled."
 *     )
 * )
 */
class CancelTransferRequestController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService
    ) {
    }

    public function __invoke(Request $request, TransferRequest $transferRequest)
    {
        $this->authorize('cancel', $transferRequest);

        // Ensure pending before proceeding
        if ($transferRequest->status !== TransferRequestStatus::PENDING) {
            return $this->sendError('Only pending requests can be canceled.', 409);
        }

        $transferRequest->status = TransferRequestStatus::CANCELED;
        $transferRequest->save();

        // Notify owner (recipient) that the helper canceled their response
        try {
            $pet = $transferRequest->pet ?: Pet::find($transferRequest->pet_id);
            if ($pet) {
                $owner = User::find($transferRequest->recipient_user_id);
                if ($owner) {
                    $this->notificationService->send(
                        $owner,
                        NotificationType::HELPER_RESPONSE_CANCELED->value,
                        [
                            'message' => 'A helper has canceled their response for '.$pet->name.'.',
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
            \Log::debug('Failed to send transfer request cancellation notification', ['error' => $e->getMessage()]);
        }

        return $this->sendSuccess($transferRequest);
    }
}
