<?php

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class DeleteChatController extends Controller
{
    use ApiResponseTrait;

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


