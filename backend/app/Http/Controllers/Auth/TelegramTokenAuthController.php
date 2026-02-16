<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class TelegramTokenAuthController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'size:64'],
        ]);

        $cacheKey = 'telegram-miniapp-login:'.$validated['token'];
        $userId = Cache::pull($cacheKey);

        if (! $userId) {
            return $this->sendError('Invalid or expired token.', 401);
        }

        $user = User::find($userId);
        if (! $user) {
            return $this->sendError('User not found.', 401);
        }

        if ($request->hasSession()) {
            Auth::login($user, true);
            $request->session()->regenerate();
        }

        Log::info('Telegram token auth: success', [
            'user_id' => $user->id,
        ]);

        return $this->sendSuccess([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ], 'Authenticated via Telegram token.');
    }
}
