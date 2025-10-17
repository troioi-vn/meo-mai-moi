<?php

namespace App\Http\Controllers;

use App\Traits\ApiResponseTrait;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    use ApiResponseTrait;

    public function __construct()
    {
        $this->middleware('auth:sanctum')->except('verify');
        $this->middleware('signed')->only('verify');
        $this->middleware('throttle:6,1')->only('verify', 'resend');
    }

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
    public function verify(Request $request, $id, $hash)
    {
        // Find the user by ID
        $user = \App\Models\User::find($id);

        if (! $user) {
            return $this->sendError('Invalid verification link.', 403);
        }

        // Verify the hash matches the user's email
        if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            return $this->sendError('Invalid verification link.', 403);
        }

        // Check if the URL is properly signed and not expired
        if (! $request->hasValidSignature()) {
            return $this->sendError('Invalid or expired verification link.', 403);
        }

        if ($user->hasVerifiedEmail()) {
            return $this->sendSuccess([
                'message' => 'Email address already verified.',
                'verified' => true,
            ]);
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return $this->sendSuccess([
            'message' => 'Email verified successfully.',
            'verified' => true,
        ]);
    }

    /**
     * Verify email address via web route and redirect to frontend
     */
    public function verifyWeb(Request $request, $id, $hash)
    {
        // Find the user by ID
        $user = \App\Models\User::find($id);

        if (! $user) {
            return redirect(env('FRONTEND_URL', 'http://localhost:5173').'/email/verify?error=invalid_link');
        }

        // Verify the hash matches the user's email
        if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            return redirect(env('FRONTEND_URL', 'http://localhost:5173').'/email/verify?error=invalid_link');
        }

        // Check if the URL is properly signed and not expired
        if (! $request->hasValidSignature()) {
            return redirect(env('FRONTEND_URL', 'http://localhost:5173').'/email/verify?error=expired_link');
        }

        if ($user->hasVerifiedEmail()) {
            return redirect(env('FRONTEND_URL', 'http://localhost:5173').'/email/verify?status=already_verified');
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return redirect(env('FRONTEND_URL', 'http://localhost:5173').'/email/verify?status=success');
    }

    /**
     * Resend the email verification notification.
     *
     * @OA\Post(
     *     path="/api/email/verification-notification",
     *     summary="Resend verification email",
     *     description="Resend email verification notification to the authenticated user.",
     *     tags={"Email Verification"},
     *     security={{"sanctum": {}}},
     *
     *     @OA\Response(
     *         response=200,
     *         description="Verification email sent",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="Verification email sent")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=400,
     *         description="Email already verified"
     *     ),
     *     @OA\Response(
     *         response=429,
     *         description="Too many requests"
     *     )
     * )
     */
    public function resend(Request $request)
    {
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email address already verified.',
            ], 400);
        }

        try {
            $request->user()->sendEmailVerificationNotification();

            return $this->sendSuccess([
                'message' => 'We have sent you verification email, please check your inbox and click the link to verify your email address. If you did not receive the email, check your spam folder.',
                'email_sent' => true,
            ]);
        } catch (\Exception $e) {
            // Log the error for admin visibility
            \Log::warning('Email verification resend failed', [
                'user_id' => $request->user()->id,
                'email' => $request->user()->email,
                'error' => $e->getMessage(),
            ]);

            // Check if it's a mail configuration issue
            $emailService = app(\App\Services\EmailConfigurationService::class);
            if (! $emailService->isEmailEnabled()) {
                return response()->json([
                    'message' => 'We are unable to send verification email at the moment. But hopefully admins are working on it and you will receive it soon.',
                ], 503);
            }

            // Generic error for other issues
            return response()->json([
                'message' => 'We are unable to send verification email at the moment. But hopefully admins are working on it and you will receive it soon.',
            ], 500);
        }
    }

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
    public function status(Request $request)
    {
        $user = $request->user();

        return $this->sendSuccess([
            'verified' => $user->hasVerifiedEmail(),
            'email' => $user->email,
        ]);
    }
}
