<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('chat.{chatId}', function ($user, $chatId) {
    return \App\Models\Chat::where('id', $chatId)
        ->whereHas('activeParticipants', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })
        ->exists();
});
