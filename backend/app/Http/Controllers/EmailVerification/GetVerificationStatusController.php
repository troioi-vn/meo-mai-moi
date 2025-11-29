<?php

namespace App\Http\Controllers\EmailVerification;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * Check email verification status.
 *
 * @OA\Get(
 *     path="/api/email/verification-status",
 *     summary="Check email verification status",
 *     description="Check if the authenticated user's email is verified.",
 *     tags={"Email Verification"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Response(
 *         response=200,
 *         description="Verification status",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="verified", type="boolean", example=true),
 *             @OA\Property(property="email", type="string", example="user@example.com")
 *         )
 *     )
 * )
 */
class GetVerificationStatusController extends Controller
{
    use ApiResponseTrait;

    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function __invoke(Request $request)
    {
        $user = $request->user();

        return $this->sendSuccess([
            'verified' => $user->hasVerifiedEmail(),
            'email' => $user->email,
        ]);
    }
}
