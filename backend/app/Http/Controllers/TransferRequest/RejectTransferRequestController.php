<?php

declare(strict_types=1);

namespace App\Http\Controllers\TransferRequest;

use App\Enums\NotificationType;
use App\Enums\TransferRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\NotificationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/transfer-requests/{id}/reject',
    summary: 'Reject a transfer request for a pet',
    tags: ['Transfer Requests'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the transfer request to reject',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Transfer request rejected successfully',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/TransferRequest'),
                ]
            )
        ),
        new OA\Response(response: 404, description: 'Transfer request not found'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden: You are not the recipient of this request or the request is not pending.'),
    ]
)]
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

        // Reject the associated response (which handles placement request reset and relationship cleanup)
        /** @var \App\Models\PlacementRequestResponse|null $response */
        $response = $transferRequest->placementRequestResponse;
        if ($response) {
            $response->reject();
        }

        // Notify helper (to_user) on rejection using NotificationService
        try {
            $pet = $transferRequest->pet;
            if ($pet) {
                $helper = User::find($transferRequest->to_user_id);
                if ($helper) {
                    $placementRequestId = ($transferRequest->placementRequest ? $transferRequest->placementRequest->id : null)
                        ?? $transferRequest->placementRequestResponse?->placement_request_id;

                    $this->notificationService->send(
                        $helper,
                        NotificationType::HELPER_RESPONSE_REJECTED->value,
                        [
                            'message' => 'The transfer for '.$pet->name.' was cancelled by the owner.',
                            'link' => $placementRequestId ? '/requests/'.$placementRequestId : '/pets/'.$pet->id.'/view',
                            'pet_name' => $pet->name,
                            'pet_id' => $pet->id,
                            'transfer_request_id' => $transferRequest->id,
                            'placement_request_id' => $placementRequestId,
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
