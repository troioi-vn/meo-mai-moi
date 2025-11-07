<?php

namespace App\Http\Controllers;

use App\Actions\Fortify\CreateNewUser;
use App\Http\Responses\Auth\LoginResponse;
use App\Http\Responses\Auth\LogoutResponse;
use App\Http\Responses\Auth\RegisterResponse;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponseTrait;

    // Legacy custom auth removed; this controller now delegates to Fortify/Jetstream flows exclusively.

    /**
     * @OA\Post(
     *     path="/api/register",
     *     summary="Register a new user",
     *     description="Registers a new user and returns an authentication token. May require invitation code when invite-only mode is active.",
     *     tags={"Authentication"},
     *
     *     @OA\RequestBody(
     *         required=true,
     *         description="User registration details",
     *
     *         @OA\JsonContent(
     *             required={"name", "email", "password", "password_confirmation"},
     *
     *             @OA\Property(property="name", type="string", example="John Doe"),
     *             @OA\Property(property="email", type="string", format="email", example="john.doe@example.com"),
     *             @OA\Property(property="password", type="string", format="password", example="password123"),
     *             @OA\Property(property="password_confirmation", type="string", format="password", example="password123"),
     *             @OA\Property(property="invitation_code", type="string", nullable=true, example="abc123def456", description="Required when invite-only mode is active")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=201,
     *         description="User registered successfully",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="We have sent you verification email, please check your inbox and click the link to verify your email address."),
     *             @OA\Property(property="access_token", type="string", example="2|aBcDeFgHiJkLmNoPqRsTuVwXyZ"),
     *             @OA\Property(property="token_type", type="string", example="Bearer"),
     *             @OA\Property(property="email_verified", type="boolean", example=false),
     *             @OA\Property(property="email_sent", type="boolean", example=true),
     *             @OA\Property(property="requires_verification", type="boolean", example=true)
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Registration not allowed (invite-only mode active without valid invitation)"
     *     )
     * )
     */
    public function register(Request $request)
    {
        // Delegate to Fortify/Jetstream implementation only
        return $this->handleJetstreamRegistration($request);
    }

    /**
     * Handle registration using Jetstream/Fortify actions
     */
    private function handleJetstreamRegistration(Request $request)
    {
        $createNewUser = app(CreateNewUser::class);
        $registerResponse = app(RegisterResponse::class);

        // Create user using Fortify action (includes all business logic)
        $user = $createNewUser->create($request->all());

        // Log in the user for session-based authentication
        if ($request->hasSession() && ! app()->runningInConsole() && ! app()->runningUnitTests() && $user->hasVerifiedEmail()) {
            try {
                Auth::login($user);
                $request->session()->regenerate();
            } catch (\Exception $e) {
                // Ignore login errors in API context
            }
        }

        // Set the user in the request for the response class
        $request->setUserResolver(function () use ($user) {
            return $user;
        });

        // Return response using Fortify response class
        return $registerResponse->toResponse($request);
    }

    /**
     * @OA\Post(
     *     path="/api/check-email",
     *     summary="Check if email exists",
     *     description="Check if an email address is registered in the system.",
     *     tags={"Authentication"},
     *
     *     @OA\RequestBody(
     *         required=true,
     *         description="Email to check",
     *
     *         @OA\JsonContent(
     *             required={"email"},
     *
     *             @OA\Property(property="email", type="string", format="email", example="user@example.com")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Email check result",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="exists", type="boolean", example=true)
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function checkEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
        ]);

        // Compute existence
        $exists = User::where('email', $request->email)->exists();

        // Audit log without leaking existence
        \Log::info('Auth email pre-check', [
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['data' => ['exists' => $exists]]);
    }

    /**
     * @OA\Post(
     *     path="/api/login",
     *     summary="Log in a user",
     *     description="Logs in a user and returns an authentication token.",
     *     tags={"Authentication"},
     *
     *     @OA\RequestBody(
     *         required=true,
     *         description="User credentials",
     *
     *         @OA\JsonContent(
     *             required={"email","password"},
     *
     *             @OA\Property(property="email", type="string", format="email", example="user@example.com"),
     *             @OA\Property(property="password", type="string", format="password", example="password123")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Login successful",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="Logged in successfully"),
     *             @OA\Property(property="access_token", type="string", example="1|aBcDeFgHiJkLmNoPqRsTuVwXyZ"),
     *             @OA\Property(property="token_type", type="string", example="Bearer"),
     *             @OA\Property(property="email_verified", type="boolean", example=true)
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=422,
     *         description="Validation error (e.g., invalid credentials)"
     *     )
     * )
     */
    public function login(Request $request)
    {
        // Delegate to Fortify/Jetstream implementation only
        return $this->handleJetstreamLogin($request);
    }

    /**
     * Handle login using Jetstream/Fortify logic
     */
    private function handleJetstreamLogin(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (Auth::attempt($credentials)) {
            $request->session()->regenerate();
            /** @var User $user */
            $user = Auth::user();

            // Set the user in the request for the response class
            $request->setUserResolver(function () use ($user) {
                return $user;
            });

            // Return response using Fortify response class
            $loginResponse = app(LoginResponse::class);

            return $loginResponse->toResponse($request);
        }

        throw ValidationException::withMessages([
            'email' => [__('auth.failed')],
        ]);
    }

    /**
     * @OA\Post(
     *     path="/api/logout",
     *     summary="Log out the current user",
     *     description="Logs out the current authenticated user by revoking their token.",
     *     tags={"Authentication"},
     *     security={{"sanctum": {}}},
     *
     *     @OA\Response(
     *         response=200,
     *         description="Logged out successfully",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="Logged out successfully")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function logout(Request $request)
    {
        // Delegate to Fortify/Jetstream implementation only
        return $this->handleJetstreamLogout($request);
    }

    /**
     * Handle logout using Jetstream/Fortify logic
     */
    private function handleJetstreamLogout(Request $request)
    {
        // Revoke current personal access token if present (skip TransientToken for cookie-based sessions)
        if ($request->user()) {
            $token = $request->user()->currentAccessToken();
            if ($token instanceof \Laravel\Sanctum\PersonalAccessToken) {
                $token->delete();
            }
        }
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        // Return response using Fortify response class
        $logoutResponse = app(LogoutResponse::class);

        return $logoutResponse->toResponse($request);
    }

    /**
     * @OA\Post(
     *     path="/api/forgot-password",
     *     summary="Request password reset",
     *     description="Send password reset link to user's email address.",
     *     tags={"Authentication"},
     *
     *     @OA\RequestBody(
     *         required=true,
     *         description="Email address to send reset link to",
     *
     *         @OA\JsonContent(
     *             required={"email"},
     *
     *             @OA\Property(property="email", type="string", format="email", example="user@example.com")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Password reset link sent successfully",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="Password reset link sent to your email address.")
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
     *             @OA\Property(property="errors", type="object", example={"email": {"The selected email is invalid."}})
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=429,
     *         description="Too many password reset attempts"
     *     )
     * )
     */
    public function forgotPassword(Request $request)
    {
        // Delegate to Fortify/Jetstream-compatible flow (via response classes)
        return app(\App\Http\Controllers\PasswordResetController::class)->sendResetLinkEmail($request);
    }

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
    public function resetPassword(Request $request)
    {
        // Delegate to Fortify/Jetstream-compatible flow (via response classes)
        return app(\App\Http\Controllers\PasswordResetController::class)->reset($request);
    }
}
