<?php

declare(strict_types=1);

namespace App\Http\Controllers\Telegram;

use App\Http\Controllers\Controller;
use App\Models\Settings;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/telegram/link-token',
    tags: ['Telegram'],
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(
            response: 200,
            description: 'OK',
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(
                        property: 'data',
                        type: 'object',
                        properties: [
                            new OA\Property(property: 'link_url', type: 'string'),
                        ]
                    ),
                ]
            )
        ),
    ]
)]
class GenerateTelegramLinkTokenController extends Controller
{
    use ApiResponseTrait;

    public function __invoke()
    {
        $user = Auth::user();

        $botUsername = Settings::get('telegram_bot_username', 'meo_mai_moi_bot');

        $token = Str::random(32);
        $user->update([
            'telegram_link_token' => $token,
            'telegram_link_token_expires_at' => now()->addMinutes(30),
        ]);

        $linkUrl = "https://t.me/{$botUsername}?start={$token}";

        return $this->sendSuccess([
            'link_url' => $linkUrl,
        ]);
    }
}
