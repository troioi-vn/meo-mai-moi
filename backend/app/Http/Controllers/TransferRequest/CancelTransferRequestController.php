<?php

namespace App\Http\Controllers\TransferRequest;

use App\Enums\NotificationType;
use App\Enums\TransferRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\NotificationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/api/transfer-requests/{id}',
    summary: 'Cancel a transfer request (by the initiator/helper)',
    tags: ['Transfer Requests'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the transfer request to cancel',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Transfer request canceled successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/TransferRequest')
        ),
        new OA\Response(response: 404, description: 'Transfer request not found'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden: You are not the initiator of this request.'),
        new OA\Response(response: 409, description: 'Only pending requests can be canceled.'),
    ]
)]
class CancelTransferRequestController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected NotificationService $notificationService
    ) {}

    public function __invoke(Request $request, TransferRequest $transferRequest)
    {
        $this->authorize('cancel', $transferRequest);

        // Ensure pending before proceeding
        if ($transferRequest->status !== TransferRequestStatus::PENDING) {
            return $this->sendError('Only pending requests can be canceled.', 409);
        }

        $transferRequest->status = TransferRequestStatus::CANCELED;
        $transferRequest->save();

        // Cancel the associated response (which handles placement request reset and relationship cleanup)
        /** @var \App\Models\PlacementRequestResponse|null $response */
        $response = $transferRequest->placementRequestResponse;
        if ($response) {
            $response->cancel();
        }

        // Notify owner (from_user) that the helper canceled their response
        try {
            $pet = $transferRequest->pet;
            if ($pet) {
                /** @var \App\Models\User|null $owner */
                $owner = User::find($transferRequest->from_user_id);
                if ($owner) {
                    /** @var \App\Models\User|null $helper */
                    $helper = User::find($transferRequest->to_user_id);
                    $helperName = $helper ? $helper->name : 'A helper';
                    $this->notificationService->send(
                        $owner,
                        NotificationType::HELPER_RESPONSE_CANCELED->value,
                        [
                            'message' => $helperName.' cancelled the pending transfer for '.$pet->name.'. The placement request is open again.',
                            'link' => '/pets/'.$pet->id,
                            'helper_name' => $helperName,
                            'pet_name' => $pet->name,
                            'pet_id' => $pet->id,
                            'transfer_request_id' => $transferRequest->id,
                        ]
                    );
                }
            }
        } catch (\Throwable $e) {
            // Notification failure is non-fatal; log and continue
            Log::debug('Failed to send transfer request cancellation notification', ['error' => $e->getMessage()]);
        }

        return $this->sendSuccess($transferRequest);
    }
}
