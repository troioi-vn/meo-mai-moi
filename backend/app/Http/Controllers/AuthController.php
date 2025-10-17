<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\InvitationService;
use App\Services\SettingsService;
use App\Traits\ApiResponseTrait;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponseTrait;

    private SettingsService $settingsService;

    private InvitationService $invitationService;

    public function __construct(SettingsService $settingsService, InvitationService $invitationService)
    {
        $this->settingsService = $settingsService;
        $this->invitationService = $invitationService;
    }

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
        // Check if invite-only mode is enabled
        $isInviteOnlyEnabled = $this->settingsService->isInviteOnlyEnabled();

        // Base validation rules
        $validationRules = [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ];

        // Add invitation code validation if invite-only mode is enabled
        if ($isInviteOnlyEnabled) {
            $validationRules['invitation_code'] = 'required|string';
        }

        $request->validate($validationRules);

        // Validate invitation code if provided (required when invite-only is enabled)
        $invitation = null;
        if ($request->invitation_code) {
            $invitation = $this->invitationService->validateInvitationCode($request->invitation_code);

            // If invite-only mode is enabled, invitation code must be valid
            if ($isInviteOnlyEnabled && ! $invitation) {
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'errors' => ['invitation_code' => ['The provided invitation code is invalid or has expired.']],
                ], 422);
            }
        }

        // Check if email verification is required
        $emailVerificationRequired = $this->settingsService->isEmailVerificationRequired();

        /** @var User $user */
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'email_verified_at' => $emailVerificationRequired ? null : now(), // Auto-verify if not required
        ]);

        // If we used an invitation code, mark it as accepted (regardless of invite-only mode)
        if (isset($invitation)) {
            $this->invitationService->acceptInvitation($request->invitation_code, $user);
        }

        // Send email verification notification only if required
                $emailSent = false;
                $emailMessage = '';
        
                if ($emailVerificationRequired) {            try {
                $user->sendEmailVerificationNotification();
                $emailSent = true;
                $emailMessage = 'We\'ve sent a verification email to '.$user->email.'. Please check your inbox and click the link to verify your email address. If you did not receive the email, check your spam folder.';
            } catch (\Exception $e) {
                // Log the error but don't fail registration
                Log::warning('Email verification could not be sent during registration', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $e->getMessage(),
                ]);
                $emailSent = false;
                $emailMessage = 'We\'ve failed to send a verification email. But hopefully you will receive it soon.';
            }
        } else {
            $emailMessage = 'Registration completed successfully. You can now access your account.';
        }

        // Create a personal access token for API clients
        $token = $user->createToken('auth_token')->plainTextToken;

        // Don't automatically log in unverified users - they need to verify email first
        // For SPA authentication, only login if we have a session and user is verified
        if ($request->hasSession() && ! app()->runningInConsole() && ! app()->runningUnitTests() && $user->hasVerifiedEmail()) {
            try {
                Auth::login($user);
                $request->session()->regenerate();
            } catch (\Exception $e) {
                // Ignore login errors in API context
                Log::debug('Session login failed in API context', ['error' => $e->getMessage()]);
            }
        }

        return $this->sendSuccess([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'email_verified' => $user->hasVerifiedEmail(),
            'email_sent' => $emailSent,
            'requires_verification' => $emailVerificationRequired && ! $user->hasVerifiedEmail(),
            'message' => $emailMessage,
        ], 201);
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
        $credentials = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (Auth::attempt($credentials)) {
            $request->session()->regenerate();
            /** @var User $user */
            $user = Auth::user();

            // Check if email verification is required and user is not verified
            $emailVerificationRequired = $this->settingsService->isEmailVerificationRequired();

            if ($emailVerificationRequired && ! $user->hasVerifiedEmail()) {
                // Don't fully log in unverified users, but provide token for verification process
                $token = $user->createToken('auth_token')->plainTextToken;

                return $this->sendSuccess([
                    'access_token' => $token,
                    'token_type' => 'Bearer',
                    'email_verified' => false,
                    'requires_verification' => true,
                    'message' => 'Please verify your email address. We have sent you verification link to your email.',
                ]);
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            return $this->sendSuccess([
                'access_token' => $token,
                'token_type' => 'Bearer',
                'email_verified' => $user->hasVerifiedEmail(),
            ]);
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

        return $this->sendSuccess(['message' => 'Logged out successfully']);
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
        $request->validate([
            'email' => 'required|email',
        ]);

        // If the email does not belong to any user, return a 404 so the frontend can notify explicitly
        $userExists = User::where('email', $request->email)->exists();
        if (! $userExists) {
            return response()->json([
                'message' => __('We couldn\'t find an account with that email address.'),
            ], 404);
        }

        // Send password reset link
        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            return $this->sendSuccess([
                'message' => __('Password reset link sent to your email address.'),
            ]);
        }

        // If throttled or other non-success status, return a generic message (avoid leaking details)
        return response()->json([
            'message' => __($status),
        ], 429);
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
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        // Reset the password
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
            return $this->sendSuccess([
                'message' => __('Password reset successfully.'),
            ]);
        }

        return $this->sendError(__($status), 422);
    }
}
