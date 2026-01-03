<?php

namespace App\Models;

use App\Enums\ChatUserRole;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatUser extends Model
{
    protected $table = 'chat_users';

    protected $fillable = [
        'chat_id',
        'user_id',
        'role',
        'joined_at',
        'left_at',
        'last_read_at',
    ];

    protected $casts = [
        'role' => ChatUserRole::class,
        'joined_at' => 'datetime',
        'left_at' => 'datetime',
        'last_read_at' => 'datetime',
    ];

    /**
     * Get the chat.
     */
    public function chat(): BelongsTo
    {
        return $this->belongsTo(Chat::class);
    }

    /**
     * Get the user.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if the user has left the chat.
     */
    public function hasLeft(): bool
    {
        return $this->left_at !== null;
    }

    /**
     * Check if the user is an admin.
     */
    public function isAdmin(): bool
    {
        return $this->role === ChatUserRole::ADMIN;
    }

    /**
     * Mark messages as read up to now.
     */
    public function markAsRead(): void
    {
        $this->update(['last_read_at' => now()]);
    }
}


