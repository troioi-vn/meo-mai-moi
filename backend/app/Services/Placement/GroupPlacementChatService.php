<?php

declare(strict_types=1);

namespace App\Services\Placement;

use App\Enums\ChatType;
use App\Enums\ChatUserRole;
use App\Enums\ContextableType;
use App\Enums\GroupRole;
use App\Enums\PlacementRequestStatus;
use App\Models\Chat;
use App\Models\ChatUser;
use App\Models\Group;
use App\Models\GroupPet;
use App\Models\PlacementRequest;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Keeps placement-chat membership in step with group membership.
 *
 * ChatPolicy authorizes on activeParticipants, so a pivot row with left_at set is
 * what actually revokes access. Miss one of the group's exit paths and a departed
 * volunteer keeps reading an adopter's messages, which is the failure worth being
 * paranoid about here.
 */
class GroupPlacementChatService
{
    /**
     * Joining gets you the conversations still in play, not the archive.
     *
     * Backfilling closed threads would drop a new volunteer into every past
     * adoption on their first day.
     */
    public function onMemberJoined(Group $group, User $user, GroupRole $role): void
    {
        $chats = $this->chatsForGroup($group, openRequestsOnly: true);

        foreach ($chats as $chat) {
            ChatUser::query()->updateOrCreate(
                ['chat_id' => $chat->id, 'user_id' => $user->id],
                [
                    'role' => $role === GroupRole::ADMIN ? ChatUserRole::ADMIN : ChatUserRole::MEMBER,
                    'joined_at' => now(),
                    'left_at' => null,
                ],
            );
        }
    }

    /**
     * Leaving ends access to every one of the group's threads, including those for
     * pets already rehomed - the messages stay for whoever is still in the group.
     */
    public function onMemberLeft(Group $group, User $user): void
    {
        $chatIds = $this->chatsForGroup($group, openRequestsOnly: false)
            ->pluck('id')
            ->all();

        if ($chatIds === []) {
            return;
        }

        ChatUser::query()
            ->whereIn('chat_id', $chatIds)
            ->where('user_id', $user->id)
            ->whereNull('left_at')
            ->update(['left_at' => now()]);
    }

    /**
     * A demoted admin should stop being able to manage participants.
     */
    public function onRoleChanged(Group $group, User $user, GroupRole $role): void
    {
        $chatIds = $this->chatsForGroup($group, openRequestsOnly: false)
            ->pluck('id')
            ->all();

        if ($chatIds === []) {
            return;
        }

        ChatUser::query()
            ->whereIn('chat_id', $chatIds)
            ->where('user_id', $user->id)
            ->whereNull('left_at')
            ->update([
                'role' => $role === GroupRole::ADMIN
                    ? ChatUserRole::ADMIN
                    : ChatUserRole::MEMBER,
            ]);
    }

    /**
     * The group is gone: nobody on the rescue side keeps access. The responder's
     * own participation is left alone so their history is not silently deleted.
     */
    public function onGroupEnded(Group $group): void
    {
        $chatIds = $this->chatsForGroup($group, openRequestsOnly: false)
            ->pluck('id')
            ->all();

        if ($chatIds === []) {
            return;
        }

        $memberIds = $group->memberships()->pluck('user_id')->all();

        if ($memberIds === []) {
            return;
        }

        ChatUser::query()
            ->whereIn('chat_id', $chatIds)
            ->whereIn('user_id', $memberIds)
            ->whereNull('left_at')
            ->update(['left_at' => now()]);
    }

    /**
     * Placement chats belonging to a group, found through the pets it holds.
     *
     * Departure deliberately looks at every assignment ever, not just the active
     * ones: an adopted pet is detached from the group, and its thread must still
     * lose the leaver.
     *
     * @return Collection<int, Chat>
     */
    private function chatsForGroup(Group $group, bool $openRequestsOnly): Collection
    {
        $petIds = GroupPet::query()
            ->where('group_id', $group->id)
            ->when($openRequestsOnly, fn ($query) => $query->active())
            ->pluck('pet_id')
            ->map(static fn ($id): int => (int) $id)
            ->unique()
            ->all();

        if ($petIds === []) {
            return collect();
        }

        $requestIds = PlacementRequest::query()
            ->whereIn('pet_id', $petIds)
            ->when(
                $openRequestsOnly,
                fn ($query) => $query->where('status', PlacementRequestStatus::OPEN)
            )
            ->pluck('id')
            ->all();

        if ($requestIds === []) {
            return collect();
        }

        /** @var Collection<int, Chat> $chats */
        $chats = Chat::query()
            ->where('type', ChatType::PRIVATE_GROUP)
            ->where('contextable_type', ContextableType::PLACEMENT_REQUEST)
            ->whereIn('contextable_id', $requestIds)
            ->get();

        return $chats;
    }
}
