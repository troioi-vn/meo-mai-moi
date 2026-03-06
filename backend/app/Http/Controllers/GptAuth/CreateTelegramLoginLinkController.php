<?php

declare(strict_types=1);

namespace App\Http\Controllers\GptAuth;

use App\Http\Controllers\Controller;
use App\Services\GptConnectorService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/gpt-auth/telegram-link',
    summary: 'Create Telegram login link for GPT connector consent',
    description: 'Validates the GPT session signature and creates a short-lived Telegram login token that returns the user to the GPT consent screen after Telegram authentication.',
    tags: ['GPT Auth'],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['session_id', 'session_sig'],
            properties: [
                new OA\Property(property: 'session_id', type: 'string', format: 'uuid', example: '7e8e7807-778f-489f-9407-bf64af1c8fff'),
                new OA\Property(property: 'session_sig', type: 'string', example: 'f4a8d23236d5a0f8f8fcb86c7dbe34ad67d6c9f1a0f00114bca2fd249299f2d0'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Telegram login token created successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(
                        property: 'data',
                        type: 'object',
                        properties: [
                            new OA\Property(property: 'telegram_login_token', type: 'string', example: 'd9f6cdb74cfa4d3aa4df'),
                        ]
                    ),
                ]
            )
        ),
        new OA\Response(
            response: 400,
            description: 'Invalid session signature',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: false),
                    new OA\Property(property: 'message', type: 'string', example: 'Invalid session signature.'),
                ]
            )
        ),
    ]
)]
class CreateTelegramLoginLinkController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, GptConnectorService $gptConnectorService)
    {
        $validated = $request->validate([
            'session_id' => ['required', 'uuid'],
            'session_sig' => ['required', 'string'],
        ]);

        $sessionId = $validated['session_id'];
        $sessionSignature = $validated['session_sig'];

        if (! $gptConnectorService->isValidSessionSignature($sessionId, $sessionSignature)) {
            return $this->sendError('Invalid session signature.', 400);
        }

        $redirectPath = sprintf(
            '/gpt-connect?session_id=%s&session_sig=%s',
            rawurlencode($sessionId),
            rawurlencode($sessionSignature)
        );

        $token = Str::lower(Str::random(20));
        Cache::put("telegram-login-redirect:{$token}", $redirectPath, now()->addMinutes(30));

        return $this->sendSuccess([
            'telegram_login_token' => $token,
        ]);
    }
}
