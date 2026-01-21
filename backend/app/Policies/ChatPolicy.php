<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Chat;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ChatPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Determine whether the user can view the chat.
     */
    public function view(User $user, Chat $chat): bool
    {
        return $this->isAdmin($user) || $chat->hasParticipant($user);
    }

    /**
     * Determine whether the user can create chats.
     */
    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Chat $chat): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Determine whether the user can send messages in the chat.
     */
    public function sendMessage(User $user, Chat $chat): bool
    {
        return $chat->hasParticipant($user);
    }

    /**
     * Determine whether the user can delete the chat.
     * Admins can delete, participants can leave.
     */
    public function delete(User $user, Chat $chat): bool
    {
        return $this->isAdmin($user) || $chat->hasParticipant($user);
    }

    public function deleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDelete(User $user, Chat $chat): bool
    {
        return $this->isAdmin($user);
    }

    public function forceDeleteAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function restore(User $user, Chat $chat): bool
    {
        return $this->isAdmin($user);
    }

    public function restoreAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function replicate(User $user, Chat $chat): bool
    {
        return $this->isAdmin($user);
    }

    public function reorder(User $user): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Determine whether the user can manage participants.
     */
    public function manageParticipants(User $user, Chat $chat): bool
    {
        return $this->isAdmin($user) || $chat->isAdmin($user);
    }

    /**
     * Check if user is a system admin.
     */
    private function isAdmin(User $user): bool
    {
        return method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
    }
}
