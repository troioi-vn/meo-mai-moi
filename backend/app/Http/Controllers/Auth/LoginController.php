<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Responses\Auth\LoginResponse;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

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
class LoginController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
            'remember' => 'sometimes|boolean',
        ]);

        $credentials = [
            'email' => $validated['email'],
            'password' => $validated['password'],
        ];
        $remember = (bool) ($validated['remember'] ?? false);

        if (Auth::attempt($credentials, $remember)) {
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
}
