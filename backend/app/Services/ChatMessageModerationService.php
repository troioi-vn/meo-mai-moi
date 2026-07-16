<?php

declare(strict_types=1);

namespace App\Services;

use App\Events\MessageDeleted;
use App\Models\ChatMessage;

class ChatMessageModerationService
{
    public function softDelete(ChatMessage $message): void
    {
        if ($message->trashed()) {
            return;
        }

        $chatId = $message->chat_id;
        $messageId = $message->id;

        $message->delete();

        broadcast(new MessageDeleted($messageId, $chatId))->toOthers();
    }
}
