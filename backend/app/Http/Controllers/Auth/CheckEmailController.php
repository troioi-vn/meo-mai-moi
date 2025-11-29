<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

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
class CheckEmailController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
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
}
