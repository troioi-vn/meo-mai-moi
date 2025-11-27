<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Responses\Auth\LogoutResponse;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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
class LogoutController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
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
}
