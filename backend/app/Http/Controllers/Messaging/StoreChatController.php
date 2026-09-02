<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Enums\ChatType;
use App\Enums\ContextableType;
use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\User;
use App\Services\PetAccessService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Enum;
use Laravel\Sanctum\PersonalAccessToken;
use OpenApi\Attributes as OA;

class StoreChatController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        private readonly PetAccessService $petAccess,
    ) {}

    #[OA\Post(
        path: '/api/msg/chats',
        summary: 'Create or find a chat',
        tags: ['Messaging'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['type'],
                properties: [
                    new OA\Property(property: 'type', type: 'string', enum: ['direct', 'group']),
                    new OA\Property(property: 'recipient_id', type: 'integer', description: 'Required if type is direct'),
                    new OA\Property(property: 'contextable_type', type: 'string', nullable: true),
                    new OA\Property(property: 'contextable_id', type: 'integer', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Chat object',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [new OA\Property(property: 'data', ref: '#/components/schemas/Chat')]
                )
            ),
            new OA\Response(response: 201, description: 'Created successfully'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 422, description: 'Validation error'),
        ]
    )]
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'type' => ['required', new Enum(ChatType::class)],
            'recipient_id' => ['required_if:type,direct', 'exists:users,id'],
            'contextable_type' => ['nullable', new Enum(ContextableType::class)],
            'contextable_id' => ['nullable', 'integer'],
        ]);

        $type = ChatType::from($validated['type']);
        $bearerToken = $request->bearerToken();
        $mcpWrite = is_string($bearerToken)
            && PersonalAccessToken::findToken($bearerToken)?->can('messages:write') === true;
        if ($mcpWrite && ($type !== ChatType::DIRECT
            || ($validated['contextable_type'] ?? null) !== ContextableType::PLACEMENT_REQUEST->value
            || ! isset($validated['contextable_id']))) {
            return $this->sendError('MCP messaging writes require an explicit placement request context.', 422);
        }

        // For direct chats
        if ($type === ChatType::DIRECT) {
            $recipientId = (int) $validated['recipient_id'];

            // Can't message yourself
            if ($recipientId === (int) $user->id) {
                return $this->sendError(__('messages.chat.cannot_message_self'), 422);
            }

            $recipient = User::find($recipientId);
            if (! $recipient) {
                return $this->sendError(__('messages.not_found'), 404);
            }

            // Parse context
            $contextableType = isset($validated['contextable_type'])
                ? ContextableType::from($validated['contextable_type'])
                : null;
            $contextableId = $validated['contextable_id'] ?? null;

            // Validate context if provided
            if ($contextableType && $contextableId) {
                if ($contextableType === ContextableType::PLACEMENT_REQUEST) {
                    /** @var PlacementRequest|null $placementRequest */
                    $placementRequest = PlacementRequest::find($contextableId);
                    if (! $placementRequest) {
                        return $this->sendError(__('messages.placement.not_found'), 404);
                    }

                    // A rescue's listing gets ONE thread per responder, shared by
                    // every volunteer, instead of a private DM with whoever
                    // happened to answer first.
                    if ($placementRequest->isGroupHeld()) {
                        if ($mcpWrite) {
                            // Agent clients stay out of group threads for now.
                            return $this->sendError(__('messages.message.group_chat_not_available_to_tokens'), 422);
                        }

                        $userResponded = $this->hasResponded($placementRequest, (int) $user->id);

                        if (! $userResponded) {
                            // Rescue side: must be entitled to act on the request,
                            // and must be writing to someone who actually applied.
                            if (! $this->petAccess->canManagePlacements($user, $placementRequest->pet)) {
                                return $this->sendError(__('messages.message.only_owner_can_message'), 403);
                            }

                            if (! $this->hasResponded($placementRequest, $recipientId)) {
                                return $this->sendError(__('messages.message.recipient_must_be_helper'), 422);
                            }
                        }

                        $responder = $userResponded ? $user : $recipient;

                        return $this->chatPayload(
                            Chat::findOrCreateGroupChat($placementRequest, $responder)
                        );
                    }

                    // Not group-held: keep the two-party thread, but authorize on
                    // the pet rather than on placement_requests.user_id, which is
                    // audit data and goes stale after an ownership transfer.
                    $ownerId = (int) $placementRequest->user_id;
                    $userIsRescueSide = $this->petAccess->canManagePlacements($user, $placementRequest->pet);

                    if ($mcpWrite) {
                        $otherPartyId = (int) $user->id === $ownerId ? $recipientId : (int) $user->id;
                        if ($recipientId !== $ownerId && (int) $user->id !== $ownerId) {
                            return $this->sendError(__('messages.message.only_owner_can_message'), 403);
                        }
                        $hasResponded = PlacementRequestResponse::query()
                            ->where('placement_request_id', $placementRequest->id)
                            ->whereHas('helperProfile', function ($query) use ($otherPartyId): void {
                                $query->where('user_id', $otherPartyId);
                            })
                            ->exists();
                        if (! $hasResponded) {
                            return $this->sendError(__('messages.message.recipient_must_be_helper'), 422);
                        }
                    }

                    // Allow helper -> owner always. For owner -> helper, the
                    // sender must be entitled to manage this pet's placements.
                    if ($recipientId !== $ownerId) {
                        if (! $userIsRescueSide) {
                            return $this->sendError(__('messages.message.only_owner_can_message'), 403);
                        }

                        // And require the recipient is a helper who has responded to this placement request
                        $recipientHasResponded = PlacementRequestResponse::query()
                            ->where('placement_request_id', $placementRequest->id)
                            ->whereHas('helperProfile', function ($query) use ($recipientId): void {
                                $query->where('user_id', $recipientId);
                            })
                            ->exists();

                        if (! $recipientHasResponded) {
                            return $this->sendError(__('messages.message.recipient_must_be_helper'), 422);
                        }
                    }
                }
            }

            return $this->chatPayload(
                Chat::findOrCreateDirect($user, $recipient, $contextableType, $contextableId)
            );
        }

        // For private groups - not implemented in phase 1
        return $this->sendError(__('messages.message.group_not_implemented'), 501);
    }

    private function hasResponded(PlacementRequest $placementRequest, int $userId): bool
    {
        return PlacementRequestResponse::query()
            ->where('placement_request_id', $placementRequest->id)
            ->whereHas('helperProfile', fn ($query) => $query->where('user_id', $userId))
            ->exists();
    }

    private function chatPayload(Chat $chat): JsonResponse
    {
        $chat->load('activeParticipants');

        $activeParticipants = $chat->activeParticipants;

        return $this->sendSuccess([
            'id' => $chat->id,
            'type' => $chat->type->value,
            'contextable_type' => $chat->contextable_type?->value,
            'contextable_id' => $chat->contextable_id,
            'group_name' => $chat->groupName(),
            'participant_count' => $activeParticipants->count(),
            /** @phpstan-ignore-next-line */
            'participants' => $activeParticipants->map(function ($p): array {
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'avatar_url' => $p->avatar_url,
                    'is_premium' => $p->hasRole('premium'),
                ];
            }),
        ], 201);
    }
}
