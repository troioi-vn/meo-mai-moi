<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Telegram\TelegramLoginLinkService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/auth/telegram/handshake',
    summary: 'Create a Telegram login link',
    description: 'Creates a short-lived Telegram deep link carrying browser context. Telegram sends the authenticated user a single-use browser return link.',
    tags: ['Authentication'],
    requestBody: new OA\RequestBody(
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'locale', type: 'string', enum: ['en', 'ru', 'uk', 'vi'], nullable: true),
            new OA\Property(property: 'redirect_path', type: 'string', example: '/account/pets', nullable: true),
            new OA\Property(property: 'invitation_code', type: 'string', nullable: true),
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

    public function __invoke(Request $request, TelegramLoginLinkService $loginLinkService): JsonResponse
    {
        $validated = $request->validate([
            'locale' => ['nullable', 'string', 'in:en,ru,uk,vi'],
            'redirect_path' => ['nullable', 'string', 'max:2048'],
            'invitation_code' => ['nullable', 'string', 'max:255'],
        ]);

        $botUsername = ltrim((string) config('telegram.user_bot.username', ''), '@');
        if ($botUsername === '') {
            return $this->sendError('Telegram login is unavailable.', 503);
        }

        $handshake = $loginLinkService->create(
            $validated['locale'] ?? null,
            $validated['redirect_path'] ?? null,
            $validated['invitation_code'] ?? null,
        );

        return $this->sendSuccess([
            ...$handshake,
            'deep_link' => "https://t.me/{$botUsername}?start=hs_{$handshake['nonce']}",
        ]);
    }
}
