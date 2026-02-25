<?php

declare(strict_types=1);

namespace App\Http\Controllers\GptAuth;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/gpt-auth/exchange',
    summary: 'Exchange GPT auth code',
    description: 'Server-to-server endpoint used by the GPT connector to exchange a one-time auth code for a Sanctum token and user id.',
    tags: ['GPT Auth'],
    parameters: [
        new OA\Parameter(
            name: 'Authorization',
            in: 'header',
            required: true,
            description: 'Bearer connector API key. Format: Bearer {GPT_CONNECTOR_API_KEY}',
            schema: new OA\Schema(type: 'string')
        ),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['code'],
            properties: [
                new OA\Property(property: 'code', type: 'string', format: 'uuid', example: '66e5f8e5-8fa6-4b4a-85cb-b45f7f878f1a'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Code exchanged successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(
                        property: 'data',
                        type: 'object',
                        properties: [
                            new OA\Property(property: 'sanctum_token', type: 'string', example: '1|qSZv6A7XQ9Q...'),
                            new OA\Property(property: 'user_id', type: 'integer', example: 42),
                        ]
                    ),
                ]
            )
        ),
        new OA\Response(
            response: 400,
            description: 'Invalid or expired code',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: false),
                    new OA\Property(property: 'message', type: 'string', example: 'Invalid or expired code.'),
                ]
            )
        ),
        new OA\Response(response: 401, description: 'Unauthorized connector API key'),
    ]
)]

class ExchangeController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'uuid'],
        ]);

        $payload = Cache::pull('gpt_auth_code:'.$validated['code']);

        if (! is_array($payload) || ! isset($payload['sanctum_token'], $payload['user_id'])) {
            return $this->sendError('Invalid or expired code.', 400);
        }

        return $this->sendSuccess([
            'sanctum_token' => (string) $payload['sanctum_token'],
            'user_id' => (int) $payload['user_id'],
        ]);
    }
}
