<?php

declare(strict_types=1);

namespace App\Http\Controllers\ApiToken;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Laravel\Jetstream\Jetstream;
use Laravel\Sanctum\PersonalAccessToken;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/user/api-tokens',
    summary: 'List API tokens for the current user',
    description: 'Session-authenticated browser endpoint for managing personal access tokens. Bearer-token-authenticated PAT requests are rejected.',
    tags: ['API Tokens'],
    responses: [
        new OA\Response(response: 200, description: 'Token list returned'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'PAT access is forbidden for this endpoint'),
    ]
)]
class ListApiTokensController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        /** @var User $user */
        $user = $request->user();

        /** @var list<PersonalAccessToken> $userTokens */
        $userTokens = $user->tokens->all();

        $tokens = array_map(function (PersonalAccessToken $token): array {
            return [
                'id' => $token->id,
                'name' => $token->name,
                'abilities' => $token->abilities,
                'created_at' => $token->created_at?->toISOString(),
                'last_used_at' => $token->last_used_at?->toISOString(),
                'last_used_ago' => $token->last_used_at?->diffForHumans(),
            ];
        }, $userTokens);

        return $this->sendSuccess([
            'tokens' => $tokens,
            'available_permissions' => Jetstream::$permissions,
            'default_permissions' => Jetstream::$defaultPermissions,
        ]);
    }
}
