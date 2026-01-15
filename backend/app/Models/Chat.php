<?php

namespace App\Models;

use App\Enums\ChatType;
use App\Enums\ChatUserRole;
use App\Enums\ContextableType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Chat extends Model
{
    // ...existing code...
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
     */
    public function contextable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the chat participants.
     */
    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'chat_users')
            ->withPivot(['role', 'joined_at', 'left_at', 'last_read_at'])
            ->withTimestamps();
    }

    /**
     * Get active participants (not left).
     */
    public function activeParticipants(): BelongsToMany
    {
        return $this->participants()->whereNull('chat_users.left_at');
    }

    /**
     * Get the chat_users pivot records.
     */
    public function chatUsers(): HasMany
    {
        return $this->hasMany(ChatUser::class);
    }

    /**
     * Get the messages in this chat.
     */
    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }

    /**
     * Get the latest message in this chat.
     */
    public function latestMessage(): HasMany
    {
        return $this->hasMany(ChatMessage::class)->latest()->limit(1);
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
            ->where(function ($query) use ($contextableType, $contextableId) {
                if ($contextableType && $contextableId) {
                    $query->where('contextable_type', $contextableType)
                        ->where('contextable_id', $contextableId);
                } else {
                    $query->whereNull('contextable_type')
                        ->whereNull('contextable_id');
                }
            })
            ->whereHas('activeParticipants', function ($query) use ($user1) {
                $query->where('user_id', $user1->id);
            })
            ->whereHas('activeParticipants', function ($query) use ($user2) {
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
            $user1->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
            $user2->id => ['role' => ChatUserRole::MEMBER, 'joined_at' => now()],
        ]);

        return $chat;
    }

    /**
     * Scope to get chats for a user.
     */
    public function scopeForUser($query, User $user)
    {
        return $query->whereHas('activeParticipants', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        });
    }

    /**
     * Scope to include unread count for a user.
     */
    public function scopeWithUnreadCount($query, User $user)
    {
        return $query->withCount([
            'messages as unread_count' => function ($query) use ($user) {
                $query->where('sender_id', '!=', $user->id)
                    ->join('chat_users', function ($join) use ($user) {
                        $join->on('chat_messages.chat_id', '=', 'chat_users.chat_id')
                            ->where('chat_users.user_id', '=', $user->id)
                            ->whereNull('chat_users.left_at');
                    })
                    ->where(function ($q) {
                        $q->whereNull('chat_users.last_read_at')
                            ->orWhere('chat_messages.created_at', '>', \DB::raw('chat_users.last_read_at'));
                    });
            },
        ]);
    }
}
