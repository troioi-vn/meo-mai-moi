<?php

declare(strict_types=1);

use App\Models\Chat;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id && $user->hasVerifiedEmail();
});

Broadcast::channel('chat.{chatId}', function ($user, $chatId) {
    return Chat::where('id', $chatId)
        ->whereHas('activeParticipants', function ($query) use ($user): void {
            $query->where('user_id', $user->id);
        })
        ->exists();
});
