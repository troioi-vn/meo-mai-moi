<?php

namespace App\Http\Controllers\TransferRequest;

use App\Enums\NotificationType;
use App\Enums\PetRelationshipType;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\TransferRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\PetRelationshipService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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

    public function __construct(
        protected NotificationService $notificationService,
        protected PetRelationshipService $petRelationshipService
    ) {}

    public function __invoke(Request $request, TransferRequest $transferRequest)
    {
        $this->authorize('confirm', $transferRequest);

        // Idempotency: confirming an already-confirmed transfer is a no-op.
        if ($transferRequest->status === TransferRequestStatus::CONFIRMED) {
            return $this->sendSuccess($transferRequest->fresh(['placementRequest']));
        }

        // Ensure pending before proceeding
        if ($transferRequest->status !== TransferRequestStatus::PENDING) {
            return $this->sendError('Only pending transfers can be confirmed.', 409);
        }

        $actor = $request->user();

        DB::transaction(function () use ($transferRequest, $actor) {
            $transferRequest = TransferRequest::whereKey($transferRequest->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Idempotency/race-safety: if another request already confirmed it.
            if ($transferRequest->status === TransferRequestStatus::CONFIRMED) {
                return;
            }

            // Mark transfer as confirmed
            $transferRequest->status = TransferRequestStatus::CONFIRMED;
            $transferRequest->confirmed_at = now();
            $transferRequest->save();

            $placement = $transferRequest->placementRequest;

            if ($placement instanceof PlacementRequest) {
                /** @var \App\Models\Pet $pet */
                $pet = $placement->pet;
                /** @var \App\Models\User $owner */
                $owner = $transferRequest->fromUser;
                /** @var \App\Models\User $helper */
                $helper = $transferRequest->toUser;

                // Determine final status based on placement type
                $finalStatus = match ($placement->request_type) {
                    PlacementRequestType::PERMANENT => PlacementRequestStatus::FINALIZED,
                    PlacementRequestType::FOSTER_PAID,
                    PlacementRequestType::FOSTER_FREE => PlacementRequestStatus::ACTIVE,
                    default => PlacementRequestStatus::ACTIVE,
                };

                $placement->update(['status' => $finalStatus]);

                // Update relationships based on placement type (post-handover)
                if ($pet && $owner && $helper) {
                    match ($placement->request_type) {
                        PlacementRequestType::PERMANENT => $this->handlePermanentHandover(
                            $pet,
                            $owner,
                            $helper,
                            $actor
                        ),
                        PlacementRequestType::FOSTER_PAID,
                        PlacementRequestType::FOSTER_FREE => $this->handleFosterHandover(
                            $pet,
                            $helper,
                            $actor
                        ),
                        default => null,
                    };
                }

                // Auto-reject all other pending responses
                if ($transferRequest->placement_request_response_id) {
                    $placement->rejectOtherResponses($transferRequest->placement_request_response_id);
                }
            }
        });

        // Notify owner that helper confirmed receipt
        try {
            $pet = $transferRequest->pet;
            /** @var \App\Models\User|null $owner */
            $owner = User::find($transferRequest->from_user_id);

            if ($pet && $owner) {
                /** @var \App\Models\User|null $helper */
                $helper = User::find($transferRequest->to_user_id);
                $placementType = $transferRequest->placementRequest?->request_type->value ?? '';
                $isPermanent = $placementType === 'permanent';

                $message = $isPermanent
                    ? ($helper ? $helper->name : 'The helper').' has confirmed receiving '.$pet->name.'. The ownership transfer is complete.'
                    : ($helper ? $helper->name : 'The helper').' has confirmed receiving '.$pet->name.'. The placement is now active.';

                $this->notificationService->send(
                    $owner,
                    NotificationType::TRANSFER_CONFIRMED->value,
                    [
                        'message' => $message,
                        'link' => '/pets/'.$pet->id,
                        'pet_name' => $pet->name,
                        'pet_id' => $pet->id,
                        'helper_name' => $helper?->name,
                        'transfer_request_id' => $transferRequest->id,
                    ]
                );
            }
        } catch (\Throwable $e) {
            Log::debug('Failed to notify owner on transfer confirmation', [
                'transfer_request_id' => $transferRequest->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $this->sendSuccess($transferRequest->fresh(['placementRequest']));
    }

    protected function handlePermanentHandover(Pet $pet, User $owner, User $helper, User $actor): void
    {
        // End owner's ownership and create helper ownership (idempotent).
        $this->petRelationshipService->transferOwnership($pet, $owner, $helper, $actor);

        // Ensure the former owner keeps viewer access (idempotent).
        if (! $this->petRelationshipService->hasActiveRelationship($owner, $pet, PetRelationshipType::OWNER)) {
            $this->petRelationshipService->addViewer($pet, $owner, $actor);
        }
    }

    protected function handleFosterHandover(Pet $pet, User $helper, User $actor): void
    {
        // Foster relationship starts at confirm-time (now). Idempotent.
        $this->petRelationshipService->addFoster($pet, $helper, $actor, now());
    }
}
