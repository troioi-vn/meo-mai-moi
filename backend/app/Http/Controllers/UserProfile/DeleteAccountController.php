<?php

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeleteAccountRequest;
use App\Traits\ApiResponseTrait;

/**
 * @OA\Delete(
 *     path="/api/users/me",
 *     summary="Delete authenticated user's account",
 *     tags={"User Profile"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(
 *             required={"password"},
 *
 *             @OA\Property(property="password", type="string", format="password", example="your_current_password")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Account deleted successfully",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="Account deleted successfully.")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="Validation Error"),
 *             @OA\Property(property="errors", type="object", example={"password": {"The provided password does not match your current password."}})
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     )
 * )
 */
class DeleteAccountController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(DeleteAccountRequest $request)
    {
        $user = $request->user();
        $user->tokens()->delete(); // Revoke all tokens for the user
        $user->delete();

        return $this->sendSuccess(null, 204);
    }
}
