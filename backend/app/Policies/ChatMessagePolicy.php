<?php

namespace App\Policies;

use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ChatMessagePolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view the message.
     */
    public function view(User $user, ChatMessage $message): bool
    {
        return $this->isAdmin($user) || $message->chat->hasParticipant($user);
    }

    /**
     * Determine whether the user can delete the message.
     * Users can delete their own messages, admins can delete any message.
     */
    public function delete(User $user, ChatMessage $message): bool
    {
        if ($this->isAdmin($user)) {
            return true;
        }

        // Users can only delete their own messages
        return $message->sender_id === $user->id;
    }

    /**
     * Check if user is a system admin.
     */
    private function isAdmin(User $user): bool
    {
        return method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
    }
}

