<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Telegram\TelegramLoginHandshakeService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/auth/telegram/handshake',
    summary: 'Create a browser-bound Telegram login handshake',
    description: 'Creates a short-lived Telegram deep link bound to the current browser session. The originating browser polls the claim endpoint after the user confirms the login in Telegram.',
    tags: ['Authentication'],
    requestBody: new OA\RequestBody(
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'locale', type: 'string', enum: ['en', 'ru', 'uk', 'vi'], nullable: true),
            new OA\Property(property: 'redirect_path', type: 'string', example: '/account/pets', nullable: true),
        ])
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Handshake created',
            content: new OA\JsonContent(properties: [
                new OA\Property(property: 'success', type: 'boolean', example: true),
                new OA\Property(property: 'data', properties: [
                    new OA\Property(property: 'nonce', type: 'string', example: '7YhN2FjvK5Lq3Rz9Wc8A1B4D6E0GmPsT'),
                    new OA\Property(property: 'user_code', type: 'string', minLength: 4, maxLength: 4, example: 'K7MT'),
                    new OA\Property(property: 'deep_link', type: 'string', format: 'uri'),
                    new OA\Property(property: 'expires_in', type: 'integer', example: 300),
                ], type: 'object'),
            ])
        ),
        new OA\Response(response: 422, description: 'Invalid request'),
        new OA\Response(response: 503, description: 'Telegram bot is unavailable'),
    ]
)]
class CreateTelegramLoginHandshakeController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, TelegramLoginHandshakeService $handshakeService): JsonResponse
    {
        $validated = $request->validate([
            'locale' => ['nullable', 'string', 'in:en,ru,uk,vi'],
            'redirect_path' => ['nullable', 'string', 'max:2048'],
        ]);

        $botUsername = ltrim((string) config('telegram.user_bot.username', ''), '@');
        if ($botUsername === '') {
            return $this->sendError('Telegram login is unavailable.', 503);
        }

        $handshake = $handshakeService->create(
            $request->session()->getId(),
            $validated['locale'] ?? null,
            $validated['redirect_path'] ?? null,
        );

        return $this->sendSuccess([
            ...$handshake,
            'deep_link' => "https://t.me/{$botUsername}?start=hs_{$handshake['nonce']}",
        ]);
    }
}
