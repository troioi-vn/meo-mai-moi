<?php

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Delete(
 *     path="/api/users/me/avatar",
 *     summary="Delete authenticated user's avatar",
 *     tags={"User Profile"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="Avatar deleted successfully",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="Avatar deleted successfully.")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     ),
 *     @OA\Response(
 *         response=404,
 *         description="No avatar to delete"
 *     )
 * )
 */
class DeleteAvatarController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $user = $request->user();

        if (! $user->avatar_url) {
            return $this->sendError('No avatar to delete.', 404);
        }

        // Clear avatar from MediaLibrary
        $user->clearMediaCollection('avatar');

        return $this->sendSuccess(null, 204);
    }
}
