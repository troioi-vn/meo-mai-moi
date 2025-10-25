<?php

namespace App\Http\Controllers;

use App\Actions\Fortify\ResetUserPassword;
use App\Http\Responses\Auth\PasswordResetResponse;
use App\Http\Responses\Auth\SuccessfulPasswordResetLinkRequestResponse;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;

class PasswordResetController extends Controller
{
    use ApiResponseTrait;

    public function __construct()
    {
        $this->middleware('guest');
        $this->middleware('throttle:6,1');
    }

    // Legacy custom password reset paths removed; always use Fortify-compatible logic.

    /**
     * Send password reset link via email.
     *
     * @OA\Post(
     *     path="/api/password/email",
     *     summary="Send password reset email",
     *     description="Send password reset link to user's email address.",
     *     tags={"Password Reset"},
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="email", type="string", format="email", example="user@example.com")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Password reset email sent",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="Password reset link sent to your email")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     ),
     *     @OA\Response(
     *         response=429,
     *         description="Too many requests"
     *     )
     * )
     */
    public function sendResetLinkEmail(Request $request)
    {
        // Always handle via Fortify-compatible logic
        return $this->handleJetstreamPasswordResetLinkRequest($request);
    }

    /**
     * Reset password using token from email.
     *
     * @OA\Post(
     *     path="/api/password/reset",
     *     summary="Reset password with token",
     *     description="Reset user password using token from reset email.",
     *     tags={"Password Reset"},
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="token", type="string", example="abc123..."),
     *             @OA\Property(property="email", type="string", format="email", example="user@example.com"),
     *             @OA\Property(property="password", type="string", example="newpassword123"),
     *             @OA\Property(property="password_confirmation", type="string", example="newpassword123")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Password reset successful",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="Password reset successfully")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=422,
     *         description="Validation error or invalid token"
     *     )
     * )
     */
    public function reset(Request $request)
    {
        // Always handle via Fortify-compatible logic
        return $this->handleJetstreamPasswordReset($request);
    }

    /**
     * Validate password reset token.
     *
     * @OA\Get(
     *     path="/api/password/reset/{token}",
     *     summary="Validate password reset token",
     *     description="Check if password reset token is valid.",
     *     tags={"Password Reset"},
     *
     *     @OA\Parameter(
     *         name="token",
     *         in="path",
     *         required=true,
     *
     *         @OA\Schema(type="string"),
     *         description="Reset token"
     *     ),
     *
     *     @OA\Parameter(
     *         name="email",
     *         in="query",
     *         required=true,
     *
     *         @OA\Schema(type="string", format="email"),
     *         description="User email"
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Token is valid",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="valid", type="boolean", example=true),
     *             @OA\Property(property="email", type="string", example="user@example.com")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=422,
     *         description="Invalid token"
     *     )
     * )
     */
    public function validateToken(Request $request, string $token)
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            return response()->json([
                'message' => 'Invalid reset token.',
                'valid' => false,
            ], 422);
        }

        // Get the stored token record
        $tokenRecord = \DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->where('created_at', '>', now()->subHours(1)) // Token expires after 1 hour
            ->first();

        if (! $tokenRecord) {
            return response()->json([
                'message' => 'Invalid or expired reset token.',
                'valid' => false,
            ], 422);
        }

        // Check if the provided token matches the hashed token in database
        if (! Hash::check($token, $tokenRecord->token)) {
            return response()->json([
                'message' => 'Invalid reset token.',
                'valid' => false,
            ], 422);
        }

        return $this->sendSuccess([
            'valid' => true,
            'email' => $request->email,
        ]);
    }

    /**
     * Handle password reset link request using Jetstream/Fortify logic
     */
    private function handleJetstreamPasswordResetLinkRequest(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        try {
            // We'll send the link regardless of whether the email exists
            // This prevents email enumeration attacks
            $status = Password::sendResetLink(
                $request->only('email')
            );

            // Return response using Fortify response class
            $response = app(SuccessfulPasswordResetLinkRequestResponse::class);
            return $response->toResponse($request);
        } catch (\Exception $e) {
            \Log::warning('Password reset email failed during Jetstream flow', [
                'email' => $request->email,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'We are unable to send password reset email at the moment. Please try again later.',
            ], 500);
        }
    }

    /**
     * Handle password reset using Jetstream/Fortify actions
     */
    private function handleJetstreamPasswordReset(Request $request)
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $resetUserPassword = app(ResetUserPassword::class);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) use ($resetUserPassword, $request) {
                // Use Fortify action for password reset (includes events and security features)
                $resetUserPassword->reset($user, $request->only('password', 'password_confirmation'));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            // Return response using Fortify response class
            $response = app(PasswordResetResponse::class);
            return $response->toResponse($request);
        }

        return response()->json([
            'message' => match ($status) {
                Password::INVALID_TOKEN => 'Invalid or expired reset token.',
                Password::INVALID_USER => 'We cannot find a user with that email address.',
                default => 'Unable to reset password. Please try again.',
            },
        ], 422);
    }
}