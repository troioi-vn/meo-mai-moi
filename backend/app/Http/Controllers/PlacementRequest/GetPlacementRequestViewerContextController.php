<?php

namespace App\Http\Controllers\PlacementRequest;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\PlacementResponseStatus;
use App\Enums\TransferRequestStatus;
use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\PlacementRequest;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/placement-requests/{id}/me',
    summary: 'Get viewer context for a placement request',
    description: 'Returns viewer-specific context including their role, their response if any, their transfer request if any, and available actions they can perform.',
    tags: ['Placement Requests'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the placement request',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Viewer context for the placement request',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'viewer_role', type: 'string', enum: ['owner', 'helper', 'admin', 'public']),
                    new OA\Property(property: 'my_response', type: 'object', nullable: true),
                    new OA\Property(property: 'my_response_id', type: 'integer', nullable: true),
                    new OA\Property(property: 'my_transfer', type: 'object', nullable: true),
                    new OA\Property(property: 'available_actions', type: 'object'),
                    new OA\Property(property: 'chat_id', type: 'integer', nullable: true),
                ]
            )
        ),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
        new OA\Response(
            response: 403,
            description: 'Forbidden'
        ),
        new OA\Response(
            response: 404,
            description: 'Placement request not found'
        ),
    ]
)]
class GetPlacementRequestViewerContextController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, PlacementRequest $placementRequest)
    {
        // Authorization check
        $this->authorize('view', $placementRequest);

        /** @var \App\Models\User $user */
        $user = $request->user();

        // Load necessary relationships
        $placementRequest->load([
            'pet',
            'responses.helperProfile.user',
            'responses.transferRequest',
            'transferRequests',
        ]);

        // Determine viewer role
        $viewerRole = $this->determineViewerRole($user, $placementRequest);

        // Find user's response (if helper)
        $myResponse = null;
        $myResponseId = null;
        if ($viewerRole === 'helper') {
            $myResponse = $placementRequest->responses
                ->first(fn ($r) => $r->helperProfile?->user_id === $user->id);
            $myResponseId = $myResponse?->id;
        }

        // Find user's transfer request (if any)
        $myTransfer = null;
        if ($myResponse?->transferRequest) {
            $myTransfer = $myResponse->transferRequest;
        } else {
            // Check if user is party to any transfer
            $myTransfer = $placementRequest->transferRequests
                ->first(fn ($t) => $t->from_user_id === $user->id || $t->to_user_id === $user->id);
        }

        // Calculate available actions
        $availableActions = $this->calculateAvailableActions($user, $placementRequest, $viewerRole, $myResponse, $myTransfer);

        // Find chat ID (if exists) between viewer and counterparty
        $chatId = $this->findChatId($user, $placementRequest, $viewerRole);

        return $this->sendSuccess([
            'viewer_role' => $viewerRole,
            'my_response' => $myResponse ? [
                'id' => $myResponse->id,
                'status' => $myResponse->status,
                'message' => $myResponse->message,
                'responded_at' => $myResponse->responded_at,
                'accepted_at' => $myResponse->accepted_at,
                'rejected_at' => $myResponse->rejected_at,
                'cancelled_at' => $myResponse->cancelled_at,
            ] : null,
            'my_response_id' => $myResponseId,
            'my_transfer' => $myTransfer ? [
                'id' => $myTransfer->id,
                'status' => $myTransfer->status,
                'from_user_id' => $myTransfer->from_user_id,
                'to_user_id' => $myTransfer->to_user_id,
                'confirmed_at' => $myTransfer->confirmed_at,
            ] : null,
            'available_actions' => $availableActions,
            'chat_id' => $chatId,
        ]);
    }

    private function determineViewerRole(\App\Models\User $user, PlacementRequest $placementRequest): string
    {
        // Admin check
        if (method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin'])) {
            return 'admin';
        }

        // Owner check
        /** @var \App\Models\Pet $pet */
        $pet = $placementRequest->pet;
        if ($pet && $pet->isOwnedBy($user)) {
            return 'owner';
        }

        // Helper check (has responded or is party to transfer)
        $hasResponded = $placementRequest->responses
            ->contains(fn ($r) => $r->helperProfile?->user_id === $user->id);

        $isTransferParty = $placementRequest->transferRequests
            ->contains(fn ($t) => $t->from_user_id === $user->id || $t->to_user_id === $user->id);

        if ($hasResponded || $isTransferParty) {
            return 'helper';
        }

        return 'public';
    }

    private function calculateAvailableActions(
        \App\Models\User $user,
        PlacementRequest $placementRequest,
        string $viewerRole,
        $myResponse,
        $myTransfer
    ): array {
        $isOpen = $placementRequest->status === PlacementRequestStatus::OPEN;
        $isPendingTransfer = $placementRequest->status === PlacementRequestStatus::PENDING_TRANSFER;
        $isActive = $placementRequest->status === PlacementRequestStatus::ACTIVE;
        $isTemporary = in_array($placementRequest->request_type, [
            PlacementRequestType::FOSTER_FREE,
            PlacementRequestType::FOSTER_PAID,
            PlacementRequestType::PET_SITTING,
        ], true);

        // Check if user has a helper profile
        $hasHelperProfile = $user->helperProfiles()->where('status', 'active')->exists();

        // Check if user has already responded (any status)
        $hasExistingResponse = $myResponse !== null;
        $hasPendingResponse = $myResponse?->status === PlacementResponseStatus::RESPONDED;
        $hasAcceptedResponse = $myResponse?->status === PlacementResponseStatus::ACCEPTED;

        // Check if blocked from responding (was rejected)
        $isBlocked = $myResponse?->status === PlacementResponseStatus::REJECTED;

        // Can respond: is open, has helper profile, not owner, not already responded (or cancelled), not blocked
        $canRespond = $isOpen
            && $hasHelperProfile
            && $viewerRole !== 'owner'
            && ! $hasPendingResponse
            && ! $hasAcceptedResponse
            && ! $isBlocked;

        // Can cancel response: has pending response
        $canCancelMyResponse = $hasPendingResponse;

        // Can accept/reject responses: is owner/admin and request is open
        $canAcceptResponses = ($viewerRole === 'owner' || $viewerRole === 'admin') && $isOpen;
        $canRejectResponses = ($viewerRole === 'owner' || $viewerRole === 'admin') && $isOpen;

        // Can confirm handover: is accepted helper with pending transfer
        $canConfirmHandover = $hasAcceptedResponse
            && $myTransfer
            && $myTransfer->status === TransferRequestStatus::PENDING
            && $myTransfer->to_user_id === $user->id;

        // Can finalize: is owner, request is active, and is temporary type
        $canFinalize = ($viewerRole === 'owner' || $viewerRole === 'admin')
            && $isActive
            && $isTemporary;

        // Can delete: is owner/admin and request is open
        $canDeleteRequest = ($viewerRole === 'owner' || $viewerRole === 'admin') && $isOpen;

        return [
            'can_respond' => $canRespond,
            'can_cancel_my_response' => $canCancelMyResponse,
            'can_accept_responses' => $canAcceptResponses,
            'can_reject_responses' => $canRejectResponses,
            'can_confirm_handover' => $canConfirmHandover,
            'can_finalize' => $canFinalize,
            'can_delete_request' => $canDeleteRequest,
        ];
    }

    private function findChatId(\App\Models\User $user, PlacementRequest $placementRequest, string $viewerRole): ?int
    {
        // Determine counterparty based on viewer role
        $counterpartyId = null;

        if ($viewerRole === 'owner') {
            // Owner chatting with accepted helper
            $acceptedResponse = $placementRequest->responses
                ->first(fn ($r) => $r->status === PlacementResponseStatus::ACCEPTED);
            $counterpartyId = $acceptedResponse?->helperProfile?->user_id;
        } elseif ($viewerRole === 'helper') {
            // Helper chatting with owner
            $counterpartyId = $placementRequest->user_id;
        }

        if (! $counterpartyId) {
            return null;
        }

        // Find existing chat between user and counterparty for this placement request
        $chat = Chat::where('contextable_type', \App\Enums\ContextableType::PLACEMENT_REQUEST)
            ->where('contextable_id', $placementRequest->id)
            ->whereHas('activeParticipants', fn ($q) => $q->where('user_id', $user->id))
            ->whereHas('activeParticipants', fn ($q) => $q->where('user_id', $counterpartyId))
            ->first();

        return $chat?->id;
    }
}
