<?php

namespace App\Http\Controllers\Messaging;

use App\Enums\ChatType;
use App\Enums\ContextableType;
use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\PlacementRequest;
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
            $recipientId = $validated['recipient_id'];

            // Can't message yourself
            if ($recipientId == $user->id) {
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
                    // Verify recipient is the owner of the placement request
                    if ($placementRequest->user_id !== $recipientId) {
                        return $this->sendError('Recipient must be the owner of the placement request.', 422);
                    }
                }
            }

            $chat = Chat::findOrCreateDirect($user, $recipient, $contextableType, $contextableId);

            $chat->load('activeParticipants');

            /** @var \Illuminate\Database\Eloquent\Collection<int, User> $activeParticipants */
            $activeParticipants = $chat->activeParticipants;

            return $this->sendSuccess([
                'id' => $chat->id,
                'type' => $chat->type->value,
                'contextable_type' => $chat->contextable_type?->value,
                'contextable_id' => $chat->contextable_id,
                'participants' => $activeParticipants->map(function (User $p): array {
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


