<?php

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePasswordRequest;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * @OA\Put(
 *     path="/api/users/me/password",
 *     summary="Update authenticated user's password",
 *     tags={"User Profile"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(
 *             required={"current_password", "new_password", "new_password_confirmation"},
 *
 *             @OA\Property(property="current_password", type="string", format="password", example="old_secret_password"),
 *             @OA\Property(property="new_password", type="string", format="password", example="new_secret_password"),
 *             @OA\Property(property="new_password_confirmation", type="string", format="password", example="new_secret_password")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Password updated successfully",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="Password updated successfully.")
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
 *             @OA\Property(property="errors", type="object", example={"current_password": {"The provided password does not match your current password."}})
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     )
 * )
 */
class UpdatePasswordController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(UpdatePasswordRequest $request)
    {
        $user = $request->user();
        $plainPassword = $request->new_password;

        Log::info('UpdatePasswordController: Before setting password', [
            'user_id' => $user->id,
            'email' => $user->email,
            'password_length' => strlen($plainPassword),
            'current_password_hash' => $user->password ? substr($user->password, 0, 20) . '...' : 'null',
        ]);

        $user->password = Hash::make($plainPassword);

        Log::info('UpdatePasswordController: After Hash::make, before save', [
            'user_id' => $user->id,
            'new_password_hash_prefix' => substr($user->password, 0, 20) . '...',
            'hash_check_result' => Hash::check($plainPassword, $user->password),
        ]);

        $user->save();

        // Refresh and verify
        $user->refresh();
        Log::info('UpdatePasswordController: After save and refresh', [
            'user_id' => $user->id,
            'saved_password_hash_prefix' => substr($user->password, 0, 20) . '...',
            'hash_check_after_save' => Hash::check($plainPassword, $user->password),
        ]);

        return $this->sendSuccess(null, 204);
    }
}
