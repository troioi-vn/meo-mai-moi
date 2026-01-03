<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Fortify\CreateNewUser;
use App\Http\Controllers\Controller;
use App\Http\Responses\Auth\RegisterResponse;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

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
class RegisterController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
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
                // Session login is optional in API context - continue silently
                // Log for debugging but don't fail registration
                Log::debug('Session login failed during registration', ['error' => $e->getMessage()]);
            }
        }

        // Set the user in the request for the response class
        $request->setUserResolver(function () use ($user) {
            return $user;
        });

        // Return response using Fortify response class
        return $registerResponse->toResponse($request);
    }
}
