<?php

declare(strict_types=1);

namespace App\Services\Placement;

use App\Enums\PlacementResponseStatus;
use App\Models\PlacementRequest;
use App\Models\User;
use App\Services\PetAccessService;

class PlacementViewerRoleService
{
    public function __construct(
        private readonly PetAccessService $petAccess,
    ) {}

    /**
     * Return the viewer's request-specific role.
     *
     * An active response or any transfer participation takes precedence over pet
     * management, so a helper cannot manage their own application after joining a Group.
     *
     * @return 'owner'|'helper'|'public'
     */
    public function determine(?User $user, PlacementRequest $placementRequest): string
    {
        if ($user === null) {
            return 'public';
        }

        $placementRequest->loadMissing([
            'pet',
            'responses.helperProfile',
            'transferRequests',
        ]);

        $myResponses = $placementRequest->responses
            ->filter(fn ($response): bool => $response->helperProfile?->user_id === $user->id);
        $hasActiveResponse = $myResponses
            ->contains(fn ($response): bool => $response->status === PlacementResponseStatus::RESPONDED);

        $isTransferParty = $placementRequest->transferRequests
            ->contains(fn ($transfer): bool => $transfer->from_user_id === $user->id
                || $transfer->to_user_id === $user->id);

        if ($placementRequest->pet && $this->petAccess->isDirectOwner($user, $placementRequest->pet)) {
            return 'owner';
        }

        if ($hasActiveResponse || $isTransferParty) {
            return 'helper';
        }

        if ($placementRequest->pet && $this->petAccess->canManagePlacements($user, $placementRequest->pet)) {
            return 'owner';
        }

        if ($myResponses->isNotEmpty()) {
            return 'helper';
        }

        return 'public';
    }
}
