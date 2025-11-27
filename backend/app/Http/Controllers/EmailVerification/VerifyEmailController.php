<?php

namespace App\Http\Controllers\EmailVerification;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;

/**
 * Mark the user's email address as verified.
 *
 * @OA\Get(
 *     path="/api/email/verify/{id}/{hash}",
 *     summary="Verify email address",
 *     description="Verify user's email address using signed URL from verification email.",
 *     tags={"Email Verification"},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *
 *         @OA\Schema(type="string"),
 *         description="User ID"
 *     ),
 *
 *     @OA\Parameter(
 *         name="hash",
 *         in="path",
 *         required=true,
 *
 *         @OA\Schema(type="string"),
 *         description="Email hash"
 *     ),
 *
 *     @OA\Parameter(
 *         name="expires",
 *         in="query",
 *         required=true,
 *
 *         @OA\Schema(type="integer"),
 *         description="Expiration timestamp"
 *     ),
 *
 *     @OA\Parameter(
 *         name="signature",
 *         in="query",
 *         required=true,
 *
 *         @OA\Schema(type="string"),
 *         description="URL signature"
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Email verified successfully",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="Email verified successfully")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=400,
 *         description="Email already verified or invalid request"
 *     ),
 *     @OA\Response(
 *         response=403,
 *         description="Invalid or expired verification link"
 *     )
 * )
 */
class VerifyEmailController extends Controller
{
    use ApiResponseTrait;

    public function __construct()
    {
        $this->middleware('signed');
        $this->middleware('throttle:6,1');
    }

    public function __invoke(Request $request, $id, $hash)
    {
        // Find the user by ID
        $user = \App\Models\User::find($id);

        if (! $user) {
            // If HTML expectation and authenticated, behave like Fortify (redirect)
            if ($this->expectsHtml($request)) {
                return redirect(rtrim((string) config('app.frontend_url'), '/').'/email/verify?error=invalid_link');
            }

            return $this->sendError('Invalid verification link.', 403);
        }

        // Verify the hash matches the user's email
        if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            if ($this->expectsHtml($request)) {
                return redirect(rtrim((string) config('app.frontend_url'), '/').'/email/verify?error=invalid_link');
            }

            return $this->sendError('Invalid verification link.', 403);
        }

        // Check if the URL is properly signed and not expired
        if (! $request->hasValidSignature()) {
            if ($this->expectsHtml($request)) {
                return redirect(rtrim((string) config('app.frontend_url'), '/').'/email/verify?error=expired_link');
            }

            return $this->sendError('Invalid or expired verification link.', 403);
        }

        if ($user->hasVerifiedEmail()) {
            if ($this->expectsHtml($request)) {
                return redirect(rtrim((string) config('app.frontend_url'), '/').'/email/verify?status=already_verified');
            }

            return $this->sendSuccess([
                'message' => 'Email address already verified.',
                'verified' => true,
            ]);
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        // Content negotiation: HTML + authenticated -> redirect like Fortify
        if ($this->expectsHtml($request)) {
            return redirect(rtrim((string) config('app.frontend_url'), '/').'/email/verify?status=success');
        }

        return $this->sendSuccess([
            'message' => 'Email verified successfully.',
            'verified' => true,
        ]);
    }

    private function expectsHtml(Request $request): bool
    {
        return ! $request->expectsJson();
    }
}
