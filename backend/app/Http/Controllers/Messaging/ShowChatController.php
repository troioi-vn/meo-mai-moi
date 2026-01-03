<?php

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class ShowChatController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, Chat $chat)
    {
        $user = $request->user();

        $this->authorize('view', $chat);

        $chat->load([
            'activeParticipants' => function ($query) {
                $query->select('users.id', 'users.name', 'users.email');
            },
        ]);

        $otherParticipant = $chat->activeParticipants->firstWhere('id', '!=', $user->id);

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
            'other_participant' => $otherParticipant ? [
                'id' => $otherParticipant->id,
                'name' => $otherParticipant->name,
                'avatar_url' => $otherParticipant->avatar_url,
            ] : null,
            'created_at' => $chat->created_at,
            'updated_at' => $chat->updated_at,
        ]);
    }
}


