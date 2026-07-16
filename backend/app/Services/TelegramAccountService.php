<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;

class TelegramAccountService
{
    public function disconnect(User $user): void
    {
        $user->update([
            'telegram_chat_id' => null,
            'telegram_user_id' => null,
            'telegram_username' => null,
            'telegram_first_name' => null,
            'telegram_last_name' => null,
            'telegram_photo_url' => null,
            'telegram_link_token' => null,
            'telegram_link_token_expires_at' => null,
            'telegram_last_authenticated_at' => null,
        ]);
    }
}
