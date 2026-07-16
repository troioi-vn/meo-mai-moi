<?php

declare(strict_types=1);

namespace App\Http\Controllers\TransferRequest;

use App\Enums\TransferRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\TransferRequest;
use App\Services\TransferRequestLifecycleService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
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
        protected TransferRequestLifecycleService $lifecycleService
    ) {}

    public function __invoke(Request $request, TransferRequest $transferRequest): JsonResponse
    {
        $this->authorize('reject', $transferRequest);

        // Ensure pending before proceeding to avoid duplicate notifications
        if ($transferRequest->status !== TransferRequestStatus::PENDING) {
            return $this->sendError(__('messages.transfer.only_pending_reject'), 409);
        }

        if (! $this->lifecycleService->reject($transferRequest)) {
            return $this->sendError(__('messages.transfer.only_pending_reject'), 409);
        }

        return $this->sendSuccess($transferRequest->fresh(['placementRequest']));
    }
}
