<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ChatType;
use App\Enums\ChatUserRole;
use App\Enums\ContextableType;
use Database\Factories\ChatFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Chat extends Model
{
    // ...existing code...
    /** @use HasFactory<ChatFactory> */
    use HasFactory;

    use SoftDeletes;

    protected $fillable = [
        'type',
        'contextable_type',
        'contextable_id',
    ];

    protected $casts = [
        'type' => ChatType::class,
        'contextable_type' => ContextableType::class,
    ];

    /**
     * Get the contextable model (PlacementRequest or Pet).
     *
     * @return MorphTo<Model, $this>
     */
    public function contextable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the chat participants.
     *
     * @return BelongsToMany<User, $this>
     */
    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'chat_users')
            ->withPivot(['role', 'joined_at', 'left_at', 'last_read_at'])
            ->withTimestamps();
    }

    /**
     * Get active participants (not left).
     *
     * @return BelongsToMany<User, $this>
     */
    public function activeParticipants(): BelongsToMany
    {
        return $this->participants()->whereNull('chat_users.left_at');
    }

    /**
     * Get the chat_users pivot records.
     *
     * @return HasMany<ChatUser, $this>
     */
    public function chatUsers(): HasMany
    {
        return $this->hasMany(ChatUser::class);
    }

    /**
     * Get the messages in this chat.
     *
     * @return HasMany<ChatMessage, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }

    /**
     * Get the latest message in this chat.
     *
     * @return HasOne<ChatMessage, $this>
     */
    public function latestMessage(): HasOne
    {
        return $this->hasOne(ChatMessage::class)->latestOfMany();
    }

    /**
     * Check if a user is a participant.
     */
    public function hasParticipant(User $user): bool
    {
        return $this->activeParticipants()->where('user_id', $user->id)->exists();
    }

    /**
     * Check if a user is an admin.
     */
    public function isAdmin(User $user): bool
    {
        return $this->chatUsers()
            ->where('user_id', $user->id)
            ->whereNull('left_at')
            ->where('role', ChatUserRole::ADMIN)
            ->exists();
    }

    /**
     * Get unread count for a specific user.
     */
    public function getUnreadCountForUser(User $user): int
    {
        $chatUser = $this->chatUsers()->where('user_id', $user->id)->first();

        if (! $chatUser) {
            return 0;
        }

        $query = $this->messages()
            ->where('sender_id', '!=', $user->id);

        if ($chatUser->last_read_at) {
            $query->where('created_at', '>', $chatUser->last_read_at);
        }

        return $query->count();
    }

    /**
     * Find or create a direct chat between two users with optional context.
     */
    public static function findOrCreateDirect(
        User $user1,
        User $user2,
        ?ContextableType $contextableType = null,
        ?int $contextableId = null
    ): self {
        // Look for existing direct chat between these users with the same context
        $existingChat = self::where('type', ChatType::DIRECT)
            ->where(function ($query) use ($contextableType, $contextableId): void {
                if ($contextableType && $contextableId) {
                    $query->where('contextable_type', $contextableType)
                        ->where('contextable_id', $contextableId);
                } else {
                    $query->whereNull('contextable_type')
                        ->whereNull('contextable_id');
                }
            })
            ->whereHas('activeParticipants', function ($query) use ($user1): void {
                $query->where('user_id', $user1->id);
            })
            ->whereHas('activeParticipants', function ($query) use ($user2): void {
                $query->where('user_id', $user2->id);
            })
            ->first();

        if ($existingChat) {
            return $existingChat;
        }

        // Create new direct chat
        $chat = self::create([
            'type' => ChatType::DIRECT,
            'contextable_type' => $contextableType,
            'contextable_id' => $contextableId,
        ]);

        // Add both users as participants
        $chat->participants()->attach([
            $user1->id => ['role' => ChatUserRole::MEMBER->value, 'joined_at' => now()],
            $user2->id => ['role' => ChatUserRole::MEMBER->value, 'joined_at' => now()],
        ]);

        return $chat;
    }

    /**
     * The one conversation between a rescue and one person who answered its listing.
     *
     * Keyed on (placement request, responder) rather than on a pair of users: a
     * responder talks to the rescue, and whichever volunteer picks it up must see
     * what was already said. Separate responders never share a thread.
     */
    public static function findOrCreateGroupChat(PlacementRequest $placementRequest, User $responder): self
    {
        return DB::transaction(function () use ($placementRequest, $responder): self {
            // Serialize on the request so two volunteers opening the thread at the
            // same moment cannot create two of them.
            PlacementRequest::query()->whereKey($placementRequest->id)->lockForUpdate()->firstOrFail();

            $existing = self::query()
                ->where('type', ChatType::PRIVATE_GROUP)
                ->where('contextable_type', ContextableType::PLACEMENT_REQUEST)
                ->where('contextable_id', $placementRequest->id)
                ->whereHas('participants', fn ($query) => $query->where('user_id', $responder->id))
                ->first();

            $chat = $existing ?? self::create([
                'type' => ChatType::PRIVATE_GROUP,
                'contextable_type' => ContextableType::PLACEMENT_REQUEST,
                'contextable_id' => $placementRequest->id,
            ]);

            $chat->syncGroupParticipants($placementRequest, $responder);

            return $chat;
        });
    }

    /**
     * The organisation behind this thread, when there is one.
     *
     * Surfaced so a responder can tell they are talking to a rescue with several
     * volunteers reading, rather than to one person. Null for ordinary chats.
     */
    public function groupName(): ?string
    {
        if ($this->type !== ChatType::PRIVATE_GROUP
            || $this->contextable_type !== ContextableType::PLACEMENT_REQUEST) {
            return null;
        }

        $placementRequest = PlacementRequest::find($this->contextable_id);

        if (! $placementRequest instanceof PlacementRequest) {
            return null;
        }

        return Group::query()
            ->whereIn('id', $placementRequest->activeGroupIds())
            ->orderBy('id')
            ->value('name');
    }

    /**
     * Bring the participant list in line with the group's current roster.
     *
     * Re-joining clears left_at rather than inserting a second pivot row, so a
     * volunteer who comes back sees the thread again instead of shadowing it.
     */
    public function syncGroupParticipants(PlacementRequest $placementRequest, ?User $responder = null): void
    {
        $memberships = GroupMembership::query()
            ->whereIn('group_id', $placementRequest->activeGroupIds())
            ->active()
            ->get(['user_id', 'role']);

        $roles = [];

        foreach ($memberships as $membership) {
            $roles[(int) $membership->user_id] = $membership->isAdmin()
                ? ChatUserRole::ADMIN
                : ChatUserRole::MEMBER;
        }

        if ($responder instanceof User) {
            // The responder is a guest of the conversation, never a moderator of it.
            $roles[$responder->id] = ChatUserRole::MEMBER;
        }

        foreach ($roles as $userId => $role) {
            ChatUser::query()->updateOrCreate(
                ['chat_id' => $this->id, 'user_id' => $userId],
                ['role' => $role, 'joined_at' => now(), 'left_at' => null],
            );
        }
    }

    /**
     * Scope to get chats for a user.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeForUser(Builder $query, User $user): Builder
    {
        return $query->whereHas('activeParticipants', function (Builder $q) use ($user): void {
            $q->where('user_id', $user->id);
        });
    }

    /**
     * Scope to include unread count for a user.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeWithUnreadCount(Builder $query, User $user): Builder
    {
        return $query->withCount([
            'messages as unread_count' => function (Builder $query) use ($user): void {
                $query->where('sender_id', '!=', $user->id)
                    ->join('chat_users', function ($join) use ($user): void {
                        $join->on('chat_messages.chat_id', '=', 'chat_users.chat_id')
                            ->where('chat_users.user_id', '=', $user->id)
                            ->whereNull('chat_users.left_at');
                    })
                    ->where(function (Builder $q): void {
                        $q->whereNull('chat_users.last_read_at')
                            ->orWhere('chat_messages.created_at', '>', \DB::raw('chat_users.last_read_at'));
                    });
            },
        ]);
    }
}
