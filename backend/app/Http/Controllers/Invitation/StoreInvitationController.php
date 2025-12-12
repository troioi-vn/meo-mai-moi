<?php

namespace App\Http\Controllers\Invitation;

use App\Http\Controllers\Controller;
use App\Services\InvitationService;
use App\Services\WaitlistService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesErrors;
use App\Traits\HandlesValidation;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * @OA\Post(
 *     path="/api/invitations",
 *     summary="Generate a new invitation",
 *     description="Create a new invitation code for the authenticated user.",
 *     tags={"Invitations"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=false,
 *         description="Optional invitation parameters",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="expires_at", type="string", format="datetime", nullable=true, example="2024-12-31T23:59:59Z")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=201,
 *         description="Invitation created successfully",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="Invitation created successfully"),
 *             @OA\Property(property="data", type="object",
 *                 @OA\Property(property="id", type="integer"),
 *                 @OA\Property(property="code", type="string"),
 *                 @OA\Property(property="status", type="string", example="pending"),
 *                 @OA\Property(property="expires_at", type="string", format="datetime", nullable=true),
 *                 @OA\Property(property="invitation_url", type="string"),
 *                 @OA\Property(property="created_at", type="string", format="datetime")
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=429,
 *         description="Rate limit exceeded",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="Daily invitation limit exceeded")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     )
 * )
 */
class StoreInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesErrors;
    use HandlesValidation;

    public function __construct(
        private InvitationService $invitationService
    ) {}

    public function __invoke(Request $request)
    {
        $user = $request->user();

        // Check rate limiting
        if (! $this->invitationService->canUserGenerateInvitation($user)) {
            return $this->handleRateLimit(
                'Failed to generate invitation. You may have reached your daily limit.'
            );
        }

        $this->validateWithErrorHandling($request, [
            'email' => $this->emailValidationRules(false),
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);

        try {
            $expiresAt = $request->expires_at ? Carbon::parse($request->expires_at) : null;

            // If email is provided, check if it's on waitlist first
            if ($request->email) {
                // Check if email is on waitlist
                $waitlistService = app(WaitlistService::class);
                if ($waitlistService->isEmailOnWaitlist($request->email)) {
                    // Use waitlist service to invite from waitlist
                    $invitation = $waitlistService->inviteFromWaitlist($request->email, $user);
                } else {
                    // Generate and send invitation to email not on waitlist
                    $invitation = $this->invitationService->generateAndSendInvitation($user, $request->email, $expiresAt);
                }
            } else {
                // Generate a generic invitation
                $invitation = $this->invitationService->generateInvitation($user, $expiresAt);
            }

            return $this->sendSuccess([
                'id' => $invitation->id,
                'code' => $invitation->code,
                'status' => $invitation->status,
                'expires_at' => $invitation->expires_at,
                'invitation_url' => $invitation->getInvitationUrl(),
                'created_at' => $invitation->created_at,
            ], 201);
        } catch (\Exception $e) {
            return $this->handleException($e, 'Failed to create invitation');
        }
    }
}
