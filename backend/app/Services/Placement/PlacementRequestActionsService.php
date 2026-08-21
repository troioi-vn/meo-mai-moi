<?php

declare(strict_types=1);

namespace App\Services\Placement;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\PlacementResponseStatus;
use App\Enums\TransferRequestStatus;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\TransferRequest;
use App\Models\User;

/**
 * Single source of truth for the `available_actions` envelope on a placement request.
 *
 * This lived in two places (PlacementRequestResource and
 * GetPlacementRequestViewerContextController) with identical logic and different
 * comments. Any rule added to one and not the other silently disagreed with itself,
 * which is exactly how a permission flag ends up true in one endpoint and false in
 * the other.
 */
class PlacementRequestActionsService
{
    /**
     * @return array<string, bool>
     */
    public function calculate(
        ?User $user,
        PlacementRequest $placementRequest,
        string $viewerRole,
        ?PlacementRequestResponse $myResponse = null,
        ?TransferRequest $myTransfer = null,
    ): array {
        if ($user === null) {
            return $this->anonymousActions($placementRequest);
        }

        $isOpen = $placementRequest->status === PlacementRequestStatus::OPEN;
        $isActive = $placementRequest->status === PlacementRequestStatus::ACTIVE;
        $isOwner = $viewerRole === 'owner';
        $isTemporary = in_array($placementRequest->request_type, [
            PlacementRequestType::FOSTER_FREE,
            PlacementRequestType::FOSTER_PAID,
            PlacementRequestType::PET_SITTING,
        ], true);

        $hasPendingResponse = $myResponse?->status === PlacementResponseStatus::RESPONDED;
        $hasAcceptedResponse = $myResponse?->status === PlacementResponseStatus::ACCEPTED;
        $isBlocked = $myResponse?->status === PlacementResponseStatus::REJECTED;

        // Free of any existing commitment to this request, whichever way they respond.
        $isUncommitted = ! $hasPendingResponse && ! $hasAcceptedResponse && ! $isBlocked;

        $hasHelperProfile = $user->helperProfiles()->active()->exists();

        return [
            // Can use the full profile-select form.
            'can_respond' => $isOpen && $hasHelperProfile && ! $isOwner && $isUncommitted,
            // Can respond without building a profile first. Deliberately orthogonal to
            // can_respond: it does not require a profile, and both may be true at once.
            'can_quick_respond' => $placementRequest->allowsQuickResponse() && ! $isOwner && $isUncommitted,
            'can_cancel_my_response' => $hasPendingResponse,
            'can_accept_responses' => $isOwner && $isOpen,
            'can_reject_responses' => $isOwner && $isOpen,
            'can_confirm_handover' => $hasAcceptedResponse
                && $myTransfer !== null
                && $myTransfer->status === TransferRequestStatus::PENDING
                && $myTransfer->to_user_id === $user->id,
            'can_finalize' => $isOwner && $isActive && $isTemporary,
            'can_delete_request' => $isOwner && $isOpen,
        ];
    }

    /**
     * Anonymous visitors can do nothing yet, but they still need to know whether a
     * quick response is on offer here so the page can show the right call to action.
     * Deriving that rule in the client instead would duplicate it across languages.
     *
     * @return array<string, bool>
     */
    private function anonymousActions(PlacementRequest $placementRequest): array
    {
        return [
            'can_respond' => false,
            'can_quick_respond' => $placementRequest->allowsQuickResponse(),
            'can_cancel_my_response' => false,
            'can_accept_responses' => false,
            'can_reject_responses' => false,
            'can_confirm_handover' => false,
            'can_finalize' => false,
            'can_delete_request' => false,
        ];
    }
}
