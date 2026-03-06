<?php

declare(strict_types=1);

namespace App\Http\Controllers\ApiToken;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Laravel\Jetstream\Jetstream;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/api/user/api-tokens/{tokenId}',
    summary: 'Update token permissions',
    description: 'Session-authenticated browser endpoint for updating token abilities. Bearer-token-authenticated PAT requests are rejected.',
    tags: ['API Tokens'],
    parameters: [
        new OA\Parameter(name: 'tokenId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['permissions'],
            properties: [
                new OA\Property(
                    property: 'permissions',
                    type: 'array',
                    items: new OA\Items(type: 'string', enum: ['create', 'read', 'update', 'delete'])
                ),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 200, description: 'Token updated'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'PAT access is forbidden for this endpoint'),
        new OA\Response(response: 404, description: 'Token not found'),
        new OA\Response(response: 422, description: 'Validation failed'),
    ]
)]
class UpdateApiTokenController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, int $tokenId)
    {
        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string'],
        ]);

        $token = $request->user()->tokens()->whereKey($tokenId)->firstOrFail();

        $token->forceFill([
            'abilities' => Jetstream::validPermissions($validated['permissions']),
        ])->save();

        return $this->sendSuccess([
            'token' => [
                'id' => $token->id,
                'name' => $token->name,
                'abilities' => $token->abilities,
                'created_at' => $token->created_at?->toISOString(),
                'last_used_at' => $token->last_used_at?->toISOString(),
            ],
        ]);
    }
}
