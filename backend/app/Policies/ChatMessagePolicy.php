<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ChatMessagePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

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

    public function deleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDelete(User $user, ChatMessage $message): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDeleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function restore(User $user, ChatMessage $message): bool
    {
        return $this->isAdmin($user);
    }

    public function restoreAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function replicate(User $user, ChatMessage $message): bool
    {
        return $this->isAdmin($user);
    }

    public function reorder(User $user): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Check if user is a system admin.
     */
    private function isAdmin(User $user): bool
    {
        return method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
    }
}
