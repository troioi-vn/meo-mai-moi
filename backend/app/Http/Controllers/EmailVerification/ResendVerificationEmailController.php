<?php

declare(strict_types=1);

namespace App\Http\Controllers\EmailVerification;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/email/verification-notification',
    summary: 'Resend verification email',
    description: 'Resend email verification notification to the authenticated user.',
    tags: ['Email Verification'],
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Verification email sent',
            content: new OA\JsonContent(ref: '#/components/schemas/VerificationNotificationResponse')
        ),
        new OA\Response(
            response: 400,
            description: 'Email already verified'
        ),
        new OA\Response(
            response: 429,
            description: 'Too many requests'
        ),
        new OA\Response(
            response: 503,
            description: 'Email system not configured'
        ),
    ]
)]
class ResendVerificationEmailController extends Controller
{
    use ApiResponseTrait;

    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware('throttle:6,1');
    }

    public function __invoke(Request $request)
    {
        if ($request->user()->hasVerifiedEmail()) {
            return $this->sendError('Email address already verified.', 400);
        }

        // Idempotency window: avoid duplicate resend spam inside 30 seconds
        $window = (int) config('notifications.email_verification_idempotency_seconds', 30);
        $recent = $request->user()->notifications()
            ->where('type', 'email_verification')
            ->where('created_at', '>=', now()->subSeconds($window))
            ->exists();
        if ($recent) {
            return $this->sendSuccess([
                'message' => 'A verification email was just sent. Please wait a moment before requesting another.',
                'email_sent' => false,
            ]);
        }

        try {
            $request->user()->sendEmailVerificationNotification();

            return $this->sendSuccess([
                'message' => 'We have sent you verification email, please check your inbox and click the link to verify your email address. If you did not receive the email, check your spam folder.',
                'email_sent' => true,
            ]);
        } catch (\Exception $e) {
            // Log the error for admin visibility
            Log::warning('Email verification resend failed', [
                'user_id' => $request->user()->id,
                'email' => $request->user()->email,
                'error' => $e->getMessage(),
            ]);

            // Check if it's a mail configuration issue
            $emailService = app(\App\Services\EmailConfigurationService::class);
            if (! $emailService->isEmailEnabled()) {
                return $this->sendError('We are unable to send verification email at the moment. But hopefully admins are working on it and you will receive it soon.', 503);
            }

            // Generic error for other issues
            return $this->sendError('We are unable to send verification email at the moment. But hopefully admins are working on it and you will receive it soon.', 500);
        }
    }
}
