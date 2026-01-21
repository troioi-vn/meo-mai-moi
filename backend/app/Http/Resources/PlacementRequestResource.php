<?php

namespace App\Http\Resources;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use App\Enums\PlacementResponseStatus;
use App\Enums\TransferRequestStatus;
use App\Models\Chat;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlacementRequestResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * Role-based shaping:
     * - Owner/Admin: see all responses with helper profiles
     * - Helper: see only their own response and the accepted response (if any)
     * - Anonymous: see response count only, no individual responses
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();
        $viewerRole = $this->determineViewerRole($user);

        $data = [
            'id' => $this->id,
            'pet_id' => $this->pet_id,
            'user_id' => $this->user_id,
            'request_type' => $this->request_type,
            'status' => $this->status,
            'notes' => $this->notes,
            'expires_at' => $this->expires_at?->toDateString(),
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,

            // Response count (always visible)
            'response_count' => $this->whenLoaded('responses', fn () => $this->responses->count(), 0),

            // Pet snapshot (breadcrumb context)
            'pet' => $this->when($this->resource->relationLoaded('pet'), fn () => $this->formatPetSnapshot()),

            // Owner info (privacy-safe: only display name, no email/phone)
            'owner' => $this->when($this->resource->relationLoaded('user') && $this->user, fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ]),
        ];

        // Role-shaped responses
        $data['responses'] = $this->formatResponsesForRole($user, $viewerRole);

        // Transfer requests (for owner/admin or parties involved)
        $data['transfer_requests'] = $this->when(
            $this->resource->relationLoaded('transferRequests'),
            fn () => $this->formatTransferRequestsForRole($user, $viewerRole)
        );

        // Viewer context (role and permissions)
        $data['viewer_role'] = $viewerRole;

        // My response ID (quick lookup for helpers)
        $data['my_response_id'] = $this->when(
            $user !== null && $viewerRole === 'helper',
            fn () => $this->findMyResponseId($user)
        );

        // Available actions (server-derived)
        $data['available_actions'] = $this->calculateAvailableActions($user, $viewerRole);

        // Chat ID (if exists between viewer and counterparty)
        $data['chat_id'] = $this->when(
            $user !== null,
            fn () => $this->findChatId($user, $viewerRole)
        );

        return $data;
    }

    /**
     * Determine the viewer's role relative to this placement request.
     */
    private function determineViewerRole(?\App\Models\User $user): string
    {
        if ($user === null) {
            return 'public';
        }

        // Admin check
        if (method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin'])) {
            return 'admin';
        }

        // Owner check
        if ($this->resource->relationLoaded('pet') && $this->pet && $this->pet->isOwnedBy($user)) {
            return 'owner';
        }

        // Helper check
        if ($this->resource->relationLoaded('responses')) {
            $hasResponded = $this->responses
                ->contains(fn ($r) => $r->helperProfile?->user_id === $user->id);
            if ($hasResponded) {
                return 'helper';
            }
        }

        if ($this->resource->relationLoaded('transferRequests')) {
            $isTransferParty = $this->transferRequests
                ->contains(fn ($t) => $t->from_user_id === $user->id || $t->to_user_id === $user->id);
            if ($isTransferParty) {
                return 'helper';
            }
        }

        return 'public';
    }

    /**
     * Format pet data as a snapshot for breadcrumb context.
     */
    private function formatPetSnapshot(): array
    {
        // Handle city which can be a string or a City model
        $cityData = null;
        if ($this->pet->relationLoaded('city') && $this->pet->city && is_object($this->pet->city)) {
            $cityData = [
                'id' => $this->pet->city->id,
                'name' => $this->pet->city->name,
            ];
        } elseif ($this->pet->city) {
            // City is stored as a string
            $cityData = $this->pet->city;
        }

        return [
            'id' => $this->pet->id,
            'name' => $this->pet->name,
            'photo_url' => $this->pet->photo_url,
            'pet_type' => $this->pet->relationLoaded('petType') && $this->pet->petType ? [
                'id' => $this->pet->petType->id,
                'name' => $this->pet->petType->name,
                'slug' => $this->pet->petType->slug,
            ] : null,
            'city' => $cityData,
            'country' => $this->pet->country,
            'state' => $this->pet->state,
        ];
    }

    /**
     * Format responses based on viewer role.
     *
     * - Owner/Admin: see all responses
     * - Helper: see only their response + accepted response
     * - Public: empty array (count only)
     */
    private function formatResponsesForRole(?\App\Models\User $user, string $viewerRole): array
    {
        if (! $this->resource->relationLoaded('responses')) {
            return [];
        }

        // Public users see no responses (only count)
        if ($viewerRole === 'public') {
            return [];
        }

        // Owner/Admin see all responses
        if ($viewerRole === 'owner' || $viewerRole === 'admin') {
            return $this->responses->map(fn ($response) => $this->formatResponse($response))->all();
        }

        // Helper sees only their response + accepted response
        if ($viewerRole === 'helper' && $user) {
            $visibleResponses = $this->responses->filter(function ($response) use ($user) {
                // User's own response
                if ($response->helperProfile?->user_id === $user->id) {
                    return true;
                }
                // The accepted response (if any)
                if ($response->status === PlacementResponseStatus::ACCEPTED) {
                    return true;
                }

                return false;
            });

            return $visibleResponses->map(fn ($response) => $this->formatResponse($response))->values()->all();
        }

        return [];
    }

    /**
     * Format a single response.
     */
    private function formatResponse($response): array
    {
        $data = [
            'id' => $response->id,
            'placement_request_id' => $response->placement_request_id,
            'helper_profile_id' => $response->helper_profile_id,
            'status' => $response->status,
            'message' => $response->message,
            'responded_at' => $response->responded_at,
            'accepted_at' => $response->accepted_at,
            'rejected_at' => $response->rejected_at,
            'cancelled_at' => $response->cancelled_at,
            'created_at' => $response->created_at,
            'updated_at' => $response->updated_at,
        ];

        // Include helper profile if loaded
        if ($response->relationLoaded('helperProfile') && $response->helperProfile) {
            $hp = $response->helperProfile;
            $data['helper_profile'] = [
                'id' => $hp->id,
                'city' => $hp->city,
                'state' => $hp->state,
                'about' => $hp->about,
                'photos' => $hp->photos ?? [],
                'user' => $hp->relationLoaded('user') && $hp->user ? [
                    'id' => $hp->user->id,
                    'name' => $hp->user->name,
                ] : null,
            ];
        }

        // Include transfer request if loaded and exists
        if ($response->relationLoaded('transferRequest') && $response->transferRequest) {
            $data['transfer_request'] = [
                'id' => $response->transferRequest->id,
                'status' => $response->transferRequest->status,
                'from_user_id' => $response->transferRequest->from_user_id,
                'to_user_id' => $response->transferRequest->to_user_id,
                'confirmed_at' => $response->transferRequest->confirmed_at,
                'rejected_at' => $response->transferRequest->rejected_at,
            ];
        }

        return $data;
    }

    /**
     * Format transfer requests for role.
     */
    private function formatTransferRequestsForRole(?\App\Models\User $user, string $viewerRole): array
    {
        // Public users see no transfer details
        if ($viewerRole === 'public') {
            return [];
        }

        // Owner/Admin see all
        if ($viewerRole === 'owner' || $viewerRole === 'admin') {
            return $this->transferRequests->map(fn ($t) => [
                'id' => $t->id,
                'placement_request_id' => $t->placement_request_id,
                'placement_request_response_id' => $t->placement_request_response_id,
                'from_user_id' => $t->from_user_id,
                'to_user_id' => $t->to_user_id,
                'status' => $t->status,
                'confirmed_at' => $t->confirmed_at,
                'rejected_at' => $t->rejected_at,
                'created_at' => $t->created_at,
            ])->all();
        }

        // Helper sees only transfers they're party to
        if ($user) {
            return $this->transferRequests
                ->filter(fn ($t) => $t->from_user_id === $user->id || $t->to_user_id === $user->id)
                ->map(fn ($t) => [
                    'id' => $t->id,
                    'placement_request_id' => $t->placement_request_id,
                    'placement_request_response_id' => $t->placement_request_response_id,
                    'from_user_id' => $t->from_user_id,
                    'to_user_id' => $t->to_user_id,
                    'status' => $t->status,
                    'confirmed_at' => $t->confirmed_at,
                    'rejected_at' => $t->rejected_at,
                    'created_at' => $t->created_at,
                ])
                ->values()
                ->all();
        }

        return [];
    }

    /**
     * Find the current user's response ID.
     */
    private function findMyResponseId(?\App\Models\User $user): ?int
    {
        if (! $user || ! $this->resource->relationLoaded('responses')) {
            return null;
        }

        $myResponse = $this->responses->first(fn ($r) => $r->helperProfile?->user_id === $user->id);

        return $myResponse?->id;
    }

    /**
     * Calculate available actions for the current user.
     */
    private function calculateAvailableActions(?\App\Models\User $user, string $viewerRole): array
    {
        // No actions for anonymous users
        if ($user === null) {
            return [
                'can_respond' => false,
                'can_cancel_my_response' => false,
                'can_accept_responses' => false,
                'can_reject_responses' => false,
                'can_confirm_handover' => false,
                'can_finalize' => false,
                'can_delete_request' => false,
            ];
        }

        $isOpen = $this->status === PlacementRequestStatus::OPEN;
        $isPendingTransfer = $this->status === PlacementRequestStatus::PENDING_TRANSFER;
        $isActive = $this->status === PlacementRequestStatus::ACTIVE;
        $isTemporary = in_array($this->request_type, [
            PlacementRequestType::FOSTER_FREE,
            PlacementRequestType::FOSTER_PAID,
            PlacementRequestType::PET_SITTING,
        ], true);

        // Find user's response
        $myResponse = null;
        if ($this->resource->relationLoaded('responses')) {
            $myResponse = $this->responses->first(fn ($r) => $r->helperProfile?->user_id === $user->id);
        }

        // Find user's transfer
        $myTransfer = null;
        if ($myResponse?->relationLoaded('transferRequest')) {
            $myTransfer = $myResponse->transferRequest;
        } elseif ($this->resource->relationLoaded('transferRequests')) {
            $myTransfer = $this->transferRequests
                ->first(fn ($t) => $t->from_user_id === $user->id || $t->to_user_id === $user->id);
        }

        $hasPendingResponse = $myResponse?->status === PlacementResponseStatus::RESPONDED;
        $hasAcceptedResponse = $myResponse?->status === PlacementResponseStatus::ACCEPTED;
        $isBlocked = $myResponse?->status === PlacementResponseStatus::REJECTED;

        // Check if user has active helper profile
        $hasHelperProfile = $user->helperProfiles()->where('status', 'active')->exists();

        // Can respond: open request, has helper profile, not the owner/admin, no existing response
        $canRespond = $isOpen
            && $hasHelperProfile
            && ! in_array($viewerRole, ['owner', 'admin'], true)
            && ! $hasPendingResponse
            && ! $hasAcceptedResponse
            && ! $isBlocked;

        return [
            'can_respond' => $canRespond,
            'can_cancel_my_response' => $hasPendingResponse,
            'can_accept_responses' => ($viewerRole === 'owner' || $viewerRole === 'admin') && $isOpen,
            'can_reject_responses' => ($viewerRole === 'owner' || $viewerRole === 'admin') && $isOpen,
            'can_confirm_handover' => $hasAcceptedResponse
                && $myTransfer
                && $myTransfer->status === TransferRequestStatus::PENDING
                && $myTransfer->to_user_id === $user->id,
            'can_finalize' => ($viewerRole === 'owner' || $viewerRole === 'admin') && $isActive && $isTemporary,
            'can_delete_request' => ($viewerRole === 'owner' || $viewerRole === 'admin') && $isOpen,
        ];
    }

    /**
     * Find existing chat ID between viewer and counterparty.
     */
    private function findChatId(?\App\Models\User $user, string $viewerRole): ?int
    {
        if (! $user) {
            return null;
        }

        $counterpartyId = null;

        if ($viewerRole === 'owner') {
            // Owner chatting with accepted helper
            if ($this->resource->relationLoaded('responses')) {
                $acceptedResponse = $this->responses
                    ->first(fn ($r) => $r->status === PlacementResponseStatus::ACCEPTED);
                $counterpartyId = $acceptedResponse?->helperProfile?->user_id;
            }
        } elseif ($viewerRole === 'helper') {
            // Helper chatting with owner
            $counterpartyId = $this->user_id;
        }

        if (! $counterpartyId) {
            return null;
        }

        // Find chat between user and counterparty with this placement request as context
        $chat = Chat::where('contextable_type', \App\Enums\ContextableType::PLACEMENT_REQUEST)
            ->where('contextable_id', $this->id)
            ->whereHas('activeParticipants', fn ($q) => $q->where('user_id', $user->id))
            ->whereHas('activeParticipants', fn ($q) => $q->where('user_id', $counterpartyId))
            ->first();

        return $chat?->id;
    }
}
