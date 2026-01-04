<?php

namespace App\Models;

use App\Enums\ChatMessageType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property Chat $chat
 */
class ChatMessage extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $table = 'chat_messages';

    protected $fillable = [
        'chat_id',
        'sender_id',
        'type',
        'content',
    ];

    protected $casts = [
        'type' => ChatMessageType::class,
    ];

    /**
     * Get the chat this message belongs to.
     */
    public function chat(): BelongsTo
    {
        return $this->belongsTo(Chat::class);
    }

    /**
     * Get the sender of the message.
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /**
     * Get the users who have read this message.
     */
    public function readers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'message_reads', 'message_id', 'user_id')
            ->withPivot('read_at');
    }

    /**
     * Check if a specific user has read this message.
     */
    public function isReadBy(User $user): bool
    {
        return $this->readers()->where('user_id', $user->id)->exists();
    }

    /**
     * Mark the message as read by a user.
     */
    public function markAsReadBy(User $user): void
    {
        if (! $this->isReadBy($user)) {
            $this->readers()->attach($user->id, ['read_at' => now()]);
        }
    }

    /**
     * Scope to get messages after a certain date.
     */
    public function scopeAfter($query, $date)
    {
        return $query->where('created_at', '>', $date);
    }

    /**
     * Scope to get messages before a certain date (for cursor pagination).
     */
    public function scopeBefore($query, $date)
    {
        return $query->where('created_at', '<', $date);
    }
}

