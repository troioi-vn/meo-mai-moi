<?php

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/api/users/me",
 *     summary="Get authenticated user's profile",
 *     tags={"User Profile"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="Successful operation",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="data", ref="#/components/schemas/User")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     )
 * )
 */
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

        return $this->sendSuccess($userData);
    }
}
