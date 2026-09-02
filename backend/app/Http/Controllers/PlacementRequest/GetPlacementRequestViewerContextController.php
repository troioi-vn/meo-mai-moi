<?php

declare(strict_types=1);

namespace App\Http\Controllers\PlacementRequest;

use App\Enums\ContextableType;
use App\Enums\PlacementResponseStatus;
use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\TransferRequest;
use App\Models\User;
use App\Services\Placement\PlacementRequestActionsService;
use App\Services\Placement\PlacementViewerRoleService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
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
                    new OA\Property(
                        property: 'data',
                        type: 'object',
                        properties: [
                            new OA\Property(property: 'viewer_role', type: 'string', enum: ['owner', 'helper', 'public']),
                            new OA\Property(property: 'my_response', type: 'object', nullable: true),
                            new OA\Property(property: 'my_response_id', type: 'integer', nullable: true),
                            new OA\Property(property: 'my_transfer', type: 'object', nullable: true),
                            new OA\Property(property: 'available_actions', type: 'object'),
                            new OA\Property(property: 'chat_id', type: 'integer', nullable: true),
                        ]
                    ),
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

    public function __construct(
        private readonly PlacementRequestActionsService $actionsService,
        private readonly PlacementViewerRoleService $viewerRoleService,
    ) {}

    public function __invoke(Request $request, PlacementRequest $placementRequest): JsonResponse
    {
        // Authorization check
        $this->authorize('view', $placementRequest);

        /** @var User $user */
        $user = $request->user();

        // Load necessary relationships
        $placementRequest->load([
            'pet',
            'responses.helperProfile.user',
            'responses.transferRequest',
            'transferRequests',
        ]);

        // Determine viewer role
        $viewerRole = $this->viewerRoleService->determine($user, $placementRequest);

        // Find user's response (if helper)
        /** @var PlacementRequestResponse|null $myResponse */
        $myResponse = null;
        $myResponseId = null;
        if ($viewerRole === 'helper') {
            $myResponse = $placementRequest->responses
                ->first(fn ($r) => $r->helperProfile?->user_id === $user->id);
            $myResponseId = $myResponse?->id;
        }

        // Find user's transfer request (if any)
        /** @var TransferRequest|null $myTransfer */
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

    /**
     * @return array<string, bool>
     */
    private function calculateAvailableActions(
        User $user,
        PlacementRequest $placementRequest,
        string $viewerRole,
        ?PlacementRequestResponse $myResponse,
        ?TransferRequest $myTransfer
    ): array {
        return $this->actionsService->calculate(
            $user,
            $placementRequest,
            $viewerRole,
            $myResponse,
            $myTransfer,
        );
    }

    private function findChatId(User $user, PlacementRequest $placementRequest, string $viewerRole): ?int
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
        $chat = Chat::where('contextable_type', ContextableType::PLACEMENT_REQUEST)
            ->where('contextable_id', $placementRequest->id)
            ->whereHas('activeParticipants', fn ($q) => $q->where('user_id', $user->id))
            ->whereHas('activeParticipants', fn ($q) => $q->where('user_id', $counterpartyId))
            ->first();

        return $chat?->id;
    }
}
