<?php

declare(strict_types=1);

namespace App\Http\Controllers\TransferRequest;

use App\Enums\TransferRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\TransferRequestLifecycleService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/transfer-requests/{id}/confirm',
    summary: 'Confirm a transfer request (helper confirms receipt of pet)',
    tags: ['Transfer Requests'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the transfer request to confirm',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Transfer request confirmed successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/TransferRequest'),
                ]
            )
        ),
        new OA\Response(response: 404, description: 'Transfer request not found'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden: You are not the recipient of this transfer or the transfer is not pending.'),
        new OA\Response(response: 409, description: 'Conflict: Only pending transfers can be confirmed.'),
    ]
)]
class ConfirmTransferRequestController extends Controller
{
    use ApiResponseTrait;
    use HandlesOfflineVersionChecks;

    public function __construct(
        protected TransferRequestLifecycleService $lifecycleService
    ) {}

    public function __invoke(Request $request, TransferRequest $transferRequest): JsonResponse
    {
        $this->authorize('confirm', $transferRequest);
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $transferRequest)) {
            return $conflict;
        }

        // Idempotency: confirming an already-confirmed transfer is a no-op.
        if ($transferRequest->status === TransferRequestStatus::CONFIRMED) {
            return $this->sendSuccess($transferRequest->fresh(['placementRequest']));
        }

        // Ensure pending before proceeding
        if ($transferRequest->status !== TransferRequestStatus::PENDING) {
            return $this->sendError(__('messages.transfer.only_pending_confirm'), 409);
        }

        $actor = $request->user();
        if (! $actor instanceof User || ! $this->lifecycleService->confirm($transferRequest, $actor)) {
            return $this->sendError(__('messages.transfer.only_pending_confirm'), 409);
        }

        return $this->sendSuccess($transferRequest->fresh(['placementRequest']));
    }
}
