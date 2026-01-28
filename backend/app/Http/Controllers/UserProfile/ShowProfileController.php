<?php

declare(strict_types=1);

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/users/me',
    summary: "Get authenticated user's profile",
    tags: ['User Profile'],
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Successful operation',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/User'),
                ]
            )
        ),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
    ]
)]
class ShowProfileController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $user = $request->user();
        $user->load('roles'); // Load roles relationship

        // Add computed properties for easier frontend access
        $userData = $user->toArray();
        $userData['can_access_admin'] = $user->hasRole(['admin', 'super_admin']);
        $userData['roles'] = $user->roles->pluck('name')->toArray();

        // Ensure avatar_url and has_password are included (they are in $appends, but let's be explicit if needed)
        $userData['avatar_url'] = $user->avatar_url;
        $userData['has_password'] = $user->has_password;

        // Ensure ban fields are present for the frontend read-only banner
        $userData['is_banned'] = (bool) $user->is_banned;
        $userData['banned_at'] = $user->banned_at;
        $userData['ban_reason'] = $user->ban_reason;

        return $this->sendSuccess($userData);
    }
}
