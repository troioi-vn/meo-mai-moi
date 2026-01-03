<?php

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

class MarkChatReadController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, Chat $chat)
    {
        $user = $request->user();

        $this->authorize('view', $chat);

        $chat->chatUsers()
            ->where('user_id', $user->id)
            ->update(['last_read_at' => now()]);

        return $this->sendSuccess(['message' => 'Chat marked as read.']);
    }
}


