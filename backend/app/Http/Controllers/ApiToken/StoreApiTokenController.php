<?php

declare(strict_types=1);

namespace App\Http\Controllers\ApiToken;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Laravel\Jetstream\Jetstream;
use Laravel\Sanctum\PersonalAccessToken;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/user/api-tokens',
    summary: 'Create an API token',
    description: 'Session-authenticated browser endpoint for creating personal access tokens. The plaintext token is returned exactly once in the response.',
    tags: ['API Tokens'],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['name'],
            properties: [
                new OA\Property(property: 'name', type: 'string', example: 'CLI token'),
                new OA\Property(
                    property: 'permissions',
                    type: 'array',
                    items: new OA\Items(type: 'string', enum: ['create', 'read', 'update', 'delete'])
                ),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 201, description: 'Token created'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'PAT access is forbidden for this endpoint'),
        new OA\Response(response: 422, description: 'Validation failed'),
    ]
)]
class StoreApiTokenController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique(PersonalAccessToken::class, 'name')
                    ->where('tokenable_type', $request->user()::class)
                    ->where('tokenable_id', $request->user()->id),
            ],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string'],
        ]);

        $token = $request->user()->createToken(
            $validated['name'],
            Jetstream::validPermissions($validated['permissions'] ?? [])
        );

        [$tokenId, $plainTextToken] = explode('|', $token->plainTextToken, 2);
        $createdToken = $request->user()->tokens()->findOrFail((int) $tokenId);

        return $this->sendSuccess([
            'token' => [
                'id' => $createdToken->id,
                'name' => $createdToken->name,
                'abilities' => $createdToken->abilities,
                'created_at' => $createdToken->created_at?->toISOString(),
                'last_used_at' => $createdToken->last_used_at?->toISOString(),
            ],
            'plain_text_token' => $plainTextToken,
        ], 201);
    }
}
