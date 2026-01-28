<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class DeleteChatController extends Controller
{
    use ApiResponseTrait;

    #[OA\Delete(
        path: '/api/msg/chats/{id}',
        summary: 'Leave or delete a chat',
        tags: ['Messaging'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(response: 204, description: 'Successfully left/deleted'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Chat not found'),
        ]
    )]
    public function __invoke(Request $request, Chat $chat)
    {
        $user = $request->user();

        $this->authorize('delete', $chat);

        $isSystemAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);

        // For non-admins, just mark them as having left the chat
        if (! $isSystemAdmin && ! $chat->isAdmin($user)) {
            $chat->chatUsers()
                ->where('user_id', $user->id)
                ->update(['left_at' => now()]);

            return $this->sendSuccess(['message' => 'Left the chat successfully.']);
        }

        // System admins or chat admins can soft delete the entire chat
        $chat->delete();

        return $this->sendSuccess(['message' => 'Chat deleted successfully.']);
    }
}
