<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Post(
 *     path="/api/reset-password",
 *     summary="Reset password with token",
 *     description="Reset user's password using the token from reset email.",
 *     tags={"Authentication"},
 *
 *     @OA\RequestBody(
 *         required=true,
 *         description="Password reset details",
 *
 *         @OA\JsonContent(
 *             required={"email", "password", "password_confirmation", "token"},
 *
 *             @OA\Property(property="email", type="string", format="email", example="user@example.com"),
 *             @OA\Property(property="password", type="string", format="password", example="newpassword123"),
 *             @OA\Property(property="password_confirmation", type="string", format="password", example="newpassword123"),
 *             @OA\Property(property="token", type="string", example="abc123def456...")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Password reset successfully",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="Password reset successfully.")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error or invalid token",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="Validation Error"),
 *             @OA\Property(property="errors", type="object", example={"email": {"This password reset token is invalid."}})
 *         )
 *     )
 * )
 */
class ResetPasswordController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->setRememberToken(Str::random(60));

                $user->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => __($status)]);
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }
}
