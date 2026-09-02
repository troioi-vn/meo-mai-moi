<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\NotificationType;
use App\Enums\PetRelationshipType;
use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\TransferRequestStatus;
use App\Models\GroupPet;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\Groups\GroupPetService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TransferRequestLifecycleService
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly PetRelationshipService $petRelationshipService,
        private readonly GroupPetService $groupPetService,
    ) {}

    public function confirm(TransferRequest $transferRequest, User $actor): bool
    {
        if ($transferRequest->status === TransferRequestStatus::CONFIRMED) {
            return true;
        }

        if ($transferRequest->status !== TransferRequestStatus::PENDING) {
            return false;
        }

        $transitioned = DB::transaction(function () use ($transferRequest, $actor): bool {
            $locked = TransferRequest::query()
                ->whereKey($transferRequest->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status === TransferRequestStatus::CONFIRMED) {
                return false;
            }

            if ($locked->status !== TransferRequestStatus::PENDING) {
                return false;
            }

            $locked->update([
                'status' => TransferRequestStatus::CONFIRMED,
                'confirmed_at' => now(),
            ]);

            $placement = $locked->placementRequest;
            if (! $placement instanceof PlacementRequest) {
                return true;
            }

            $placement->update([
                'status' => match ($placement->request_type) {
                    PlacementRequestType::PERMANENT => PlacementRequestStatus::FINALIZED,
                    default => PlacementRequestStatus::ACTIVE,
                },
            ]);

            /** @var Pet|null $pet */
            $pet = $placement->pet;
            /** @var User|null $owner */
            $owner = $locked->fromUser;
            /** @var User|null $helper */
            $helper = $locked->toUser;

            if ($pet && $owner && $helper) {
                match ($placement->request_type) {
                    PlacementRequestType::PERMANENT => $this->completePermanentHandover(
                        $pet,
                        $owner,
                        $helper,
                        $actor,
                    ),
                    PlacementRequestType::FOSTER_PAID,
                    PlacementRequestType::FOSTER_FREE => $this->petRelationshipService->addFoster(
                        $pet,
                        $helper,
                        $actor,
                        now(),
                    ),
                    default => null,
                };
            }

            if ($locked->placement_request_response_id) {
                $placement->rejectOtherResponses($locked->placement_request_response_id);
            }

            return true;
        });

        if ($transitioned) {
            $this->notifyConfirmed($transferRequest->fresh());
        }

        return $transferRequest->fresh()->status === TransferRequestStatus::CONFIRMED;
    }

    public function reject(TransferRequest $transferRequest): bool
    {
        if ($transferRequest->status !== TransferRequestStatus::PENDING) {
            return false;
        }

        $transitioned = DB::transaction(function () use ($transferRequest): bool {
            $locked = TransferRequest::query()
                ->whereKey($transferRequest->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== TransferRequestStatus::PENDING) {
                return false;
            }

            $locked->update([
                'status' => TransferRequestStatus::REJECTED,
                'rejected_at' => now(),
            ]);

            $locked->placementRequestResponse?->reject();

            return true;
        });

        if ($transitioned) {
            $this->notifyRejected($transferRequest->fresh());
        }

        return $transitioned;
    }

    private function completePermanentHandover(
        Pet $pet,
        User $owner,
        User $helper,
        User $actor
    ): void {
        // Read the attachment before transferring: the detach below erases the
        // very state the viewer-grant decision depends on.
        $wasGroupAttached = GroupPet::query()
            ->where('pet_id', $pet->id)
            ->active()
            ->exists();

        // Every owner hands over, not just the one named on the transfer. A rescue
        // pet can be co-owned, and leaving one volunteer holding OWNER after the
        // cat is adopted is invisible until someone edits a stranger's pet.
        $this->petRelationshipService->transferAllOwnership($pet, $helper, $actor);

        if ($wasGroupAttached) {
            // The cat belongs to the adopter now. The group keeps its record of the
            // placement, not standing access to someone else's pet.
            $this->groupPetService->endAllActiveAssignmentsForPet($pet);

            return;
        }

        if (! $this->petRelationshipService->hasActiveRelationship($owner, $pet, PetRelationshipType::OWNER)) {
            $this->petRelationshipService->addViewer($pet, $owner, $actor);
        }
    }

    private function notifyConfirmed(TransferRequest $transferRequest): void
    {
        try {
            $pet = $transferRequest->pet;
            $owner = $transferRequest->fromUser;
            $helper = $transferRequest->toUser;

            if (! $pet || ! $owner) {
                return;
            }

            $placement = $transferRequest->placementRequest;
            $placementRequestId = $placement?->id;
            $isPermanent = $placement?->request_type === PlacementRequestType::PERMANENT;

            $this->notificationService->send(
                $owner,
                NotificationType::TRANSFER_CONFIRMED->value,
                [
                    'message' => $helper->name.' has confirmed receiving '.$pet->name
                        .($isPermanent ? '. The ownership transfer is complete.' : '. The placement is now active.'),
                    'link' => $placementRequestId ? '/requests/'.$placementRequestId : '/pets/'.$pet->id,
                    'pet_name' => $pet->name,
                    'pet_id' => $pet->id,
                    'helper_name' => $helper?->name,
                    'transfer_request_id' => $transferRequest->id,
                    'placement_request_id' => $placementRequestId,
                ],
            );
        } catch (\Throwable $exception) {
            Log::debug('Failed to notify owner on transfer confirmation', [
                'transfer_request_id' => $transferRequest->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function notifyRejected(TransferRequest $transferRequest): void
    {
        try {
            $pet = $transferRequest->pet;
            $helper = $transferRequest->toUser;

            if (! $pet || ! $helper) {
                return;
            }

            $placementRequestId = $transferRequest->placementRequest->id;

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
                ],
            );
        } catch (\Throwable $exception) {
            Log::debug('Failed to send transfer request rejection notification', [
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
