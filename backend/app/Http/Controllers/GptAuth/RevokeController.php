<?php

declare(strict_types=1);

namespace App\Http\Controllers\GptAuth;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/gpt-auth/revoke',
    summary: 'Revoke GPT-issued Sanctum token',
    description: 'Server-to-server endpoint used by the GPT connector to revoke a plaintext Sanctum token. This endpoint is idempotent.',
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
            required: ['token'],
            properties: [
                new OA\Property(property: 'token', type: 'string', example: '1|qSZv6A7XQ9Q...'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Token revoked (or already absent)',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(
                        property: 'data',
                        type: 'object',
                        properties: [
                            new OA\Property(property: 'revoked', type: 'boolean', example: true),
                        ]
                    ),
                ]
            )
        ),
        new OA\Response(response: 401, description: 'Unauthorized connector API key'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]

class RevokeController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
        ]);

        $token = PersonalAccessToken::findToken($validated['token']);
        if ($token !== null) {
            $token->delete();
        }

        return $this->sendSuccess([
            'revoked' => true,
        ]);
    }
}
