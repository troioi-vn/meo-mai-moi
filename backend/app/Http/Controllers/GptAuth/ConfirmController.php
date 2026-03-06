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
    path: '/api/gpt-auth/confirm',
    summary: 'Confirm GPT connector consent',
    description: 'Validates GPT session signature for an authenticated user and generates a one-time auth code redirect URL for the connector callback.',
    tags: ['GPT Auth'],
    security: [['sanctum' => []]],
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
            description: 'Consent confirmed successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(
                        property: 'data',
                        type: 'object',
                        properties: [
                            new OA\Property(property: 'redirect_url', type: 'string', format: 'uri', example: 'https://gpt.troioi.vn/oauth/callback?session_id=7e8e7807-778f-489f-9407-bf64af1c8fff&code=66e5f8e5-8fa6-4b4a-85cb-b45f7f878f1a'),
                        ]
                    ),
                ]
            )
        ),
        new OA\Response(
            response: 400,
            description: 'Invalid signature or replayed session',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: false),
                    new OA\Property(property: 'message', type: 'string', example: 'Invalid session signature.'),
                ]
            )
        ),
        new OA\Response(
            response: 500,
            description: 'GPT connector is not configured',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: false),
                    new OA\Property(property: 'message', type: 'string', example: 'GPT connector is not configured.'),
                ]
            )
        ),
        new OA\Response(response: 401, description: 'Unauthenticated'),
    ]
)]

class ConfirmController extends Controller
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

        $connectorUrl = (string) config('services.gpt_connector.url', '');
        if ($connectorUrl === '') {
            return $this->sendError('GPT connector is not configured.', 500);
        }

        if (! Cache::add("gpt_confirm_used:{$sessionId}", 1, now()->addMinutes(10))) {
            return $this->sendError('Session has already been used.', 400);
        }

        // Keep legacy connector scopes while also satisfying the new generic PAT contract.
        $abilities = ['pet:read', 'pet:write', 'health:read', 'health:write', 'profile:read', 'create', 'read', 'update', 'delete'];
        $plainTextToken = $request->user()->createToken('gpt-connector', $abilities)->plainTextToken;

        $authCode = (string) Str::uuid();

        Cache::put("gpt_auth_code:{$authCode}", [
            'user_id' => $request->user()->id,
            'sanctum_token' => $plainTextToken,
        ], now()->addMinutes(5));

        return $this->sendSuccess([
            'redirect_url' => $gptConnectorService->callbackUrl($sessionId, $authCode),
        ]);
    }
}
