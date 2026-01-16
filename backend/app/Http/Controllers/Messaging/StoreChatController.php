<?php

namespace App\Http\Controllers\Messaging;

use App\Enums\ChatType;
use App\Enums\ContextableType;
use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\PlacementRequest;
use App\Models\PlacementRequestResponse;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Enum;

class StoreChatController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'type' => ['required', new Enum(ChatType::class)],
            'recipient_id' => ['required_if:type,direct', 'exists:users,id'],
            'contextable_type' => ['nullable', new Enum(ContextableType::class)],
            'contextable_id' => ['nullable', 'integer'],
        ]);

        $type = ChatType::from($validated['type']);

        // For direct chats
        if ($type === ChatType::DIRECT) {
            $recipientId = (int) $validated['recipient_id'];

            // Can't message yourself
            if ($recipientId === (int) $user->id) {
                return $this->sendError('Cannot create a chat with yourself.', 422);
            }

            $recipient = User::find($recipientId);
            if (! $recipient) {
                return $this->sendError('Recipient not found.', 404);
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
                        return $this->sendError('Placement request not found.', 404);
                    }

                    $ownerId = (int) $placementRequest->user_id;

                    // Allow helper -> owner always (owner is the placement request user)
                    if ($recipientId === $ownerId) {
                        // ok
                    } else {
                        // For owner -> helper, require the authenticated user is the owner
                        if ((int) $user->id !== $ownerId) {
                            return $this->sendError('Only the placement request owner can message helpers in this request.', 403);
                        }

                        // And require the recipient is a helper who has responded to this placement request
                        $recipientHasResponded = PlacementRequestResponse::query()
                            ->where('placement_request_id', $placementRequest->id)
                            ->whereHas('helperProfile', function ($query) use ($recipientId) {
                                $query->where('user_id', $recipientId);
                            })
                            ->exists();

                        if (! $recipientHasResponded) {
                            return $this->sendError('Recipient must be a helper who responded to the placement request.', 422);
                        }
                    }
                }
            }

            $chat = Chat::findOrCreateDirect($user, $recipient, $contextableType, $contextableId);

            $chat->load('activeParticipants');

            $activeParticipants = $chat->activeParticipants;

            return $this->sendSuccess([
                'id' => $chat->id,
                'type' => $chat->type->value,
                'contextable_type' => $chat->contextable_type?->value,
                'contextable_id' => $chat->contextable_id,
                /** @phpstan-ignore-next-line */
                'participants' => $activeParticipants->map(function ($p): array {
                    return [
                        'id' => $p->id,
                        'name' => $p->name,
                        'avatar_url' => $p->avatar_url,
                    ];
                }),
            ], 201);
        }

        // For private groups - not implemented in phase 1
        return $this->sendError('Group chats are not yet implemented.', 501);
    }
}
