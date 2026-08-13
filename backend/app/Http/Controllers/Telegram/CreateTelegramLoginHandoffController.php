<?php

declare(strict_types=1);

namespace App\Http\Controllers\Telegram;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Telegram\TelegramLoginLinkService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/telegram/handoff',
    summary: 'Hand the current session off to another browser',
    description: 'Mints a single-use, short-lived return link for the signed-in user. Cookies do not cross browsers, so a client stuck in an in-app webview needs a fresh token to carry the session into the system browser or a newly installed PWA.',
    security: [['sanctum' => []]],
    tags: ['Authentication'],
    requestBody: new OA\RequestBody(
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'redirect_path', type: 'string', example: '/account/pets', nullable: true),
        ])
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Handoff link created',
            content: new OA\JsonContent(properties: [
                new OA\Property(property: 'success', type: 'boolean', example: true),
                new OA\Property(property: 'data', properties: [
                    new OA\Property(property: 'url', type: 'string', format: 'uri'),
                    new OA\Property(property: 'expires_in', type: 'integer', example: 60),
                ], type: 'object'),
            ])
        ),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 422, description: 'Invalid request'),
    ]
)]
class CreateTelegramLoginHandoffController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, TelegramLoginLinkService $loginLinkService): JsonResponse
    {
        $validated = $request->validate([
            'redirect_path' => ['nullable', 'string', 'max:2048'],
        ]);

        $user = $request->user();
        if (! $user instanceof User) {
            return $this->sendError('Unauthenticated.', 401);
        }

        $handoff = $loginLinkService->issueReturnToken(
            $user,
            $validated['redirect_path'] ?? null,
            TelegramLoginLinkService::HANDOFF_TOKEN_TTL_SECONDS,
        );

        return $this->sendSuccess([
            'url' => $loginLinkService->returnUrl($handoff['token']),
            'expires_in' => $handoff['expires_in'],
        ]);
    }
}
