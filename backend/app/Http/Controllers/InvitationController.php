<?php

namespace App\Http\Controllers;

use App\Services\InvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesErrors;
use App\Traits\HandlesValidation;
use Carbon\Carbon;
use Illuminate\Http\Request;

class InvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesErrors;
    use HandlesValidation;

    private InvitationService $invitationService;

    public function __construct(InvitationService $invitationService)
    {
        $this->invitationService = $invitationService;
        $this->middleware('auth:sanctum')->except(['validateCode']);
    }

    /**
     * @OA\Get(
     *     path="/api/invitations",
     *     summary="Get user's sent invitations",
     *     description="Retrieve all invitations sent by the authenticated user.",
     *     tags={"Invitations"},
     *     security={{"sanctum": {}}},
     *
     *     @OA\Response(
     *         response=200,
     *         description="List of sent invitations",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="data", type="array",
     *                 @OA\Items(type="object",
     *                     @OA\Property(property="id", type="integer"),
     *                     @OA\Property(property="code", type="string"),
     *                     @OA\Property(property="status", type="string"),
     *                     @OA\Property(property="expires_at", type="string", format="datetime", nullable=true),
     *                     @OA\Property(property="created_at", type="string", format="datetime"),
     *                     @OA\Property(property="invitation_url", type="string"),
     *                     @OA\Property(property="recipient", type="object", nullable=true)
     *                 )
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $invitations = $this->invitationService->getUserInvitations($user);

        $data = [];
        foreach ($invitations as $invitation) {
            /** @var \App\Models\Invitation $invitation */
            $data[] = [
                'id' => $invitation->id,
                'code' => $invitation->code,
                'status' => $invitation->status,
                'expires_at' => $invitation->expires_at,
                'created_at' => $invitation->created_at,
                'invitation_url' => $invitation->getInvitationUrl(),
                'recipient' => $invitation->recipient ? [
                    'id' => $invitation->recipient->id,
                    'name' => $invitation->recipient->name,
                    'email' => $invitation->recipient->email,
                ] : null,
            ];
        }

        return $this->sendSuccess($data);
    }

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
    public function store(Request $request)
    {
        $user = $request->user();

        // Check rate limiting
        if (!$this->invitationService->canUserGenerateInvitation($user)) {
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
                $waitlistService = app(\App\Services\WaitlistService::class);
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

    /**
     * @OA\Delete(
     *     path="/api/invitations/{id}",
     *     summary="Revoke an invitation",
     *     description="Revoke a pending invitation sent by the authenticated user.",
     *     tags={"Invitations"},
     *     security={{"sanctum": {}}},
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Invitation ID",
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Invitation revoked successfully",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="Invitation revoked successfully")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=404,
     *         description="Invitation not found or cannot be revoked",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="Invitation not found or cannot be revoked")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function destroy(Request $request, int $id)
    {
        $user = $request->user();

        $success = $this->invitationService->revokeInvitation($id, $user);

        if (!$success) {
            return $this->handleBusinessError(
                'Invitation not found or cannot be revoked',
                404
            );
        }

        return $this->sendSuccess([], 200);
    }

    /**
     * Get invitation statistics for the authenticated user
     */
    public function stats(Request $request)
    {
        $user = $request->user();
        $stats = $this->invitationService->getUserInvitationStats($user);

        return $this->sendSuccess($stats);
    }

    /**
     * Validate an invitation code (public endpoint for registration)
     */
    public function validateCode(Request $request)
    {
        $this->validateWithErrorHandling($request, [
            'code' => $this->textValidationRules(),
        ]);

        $invitation = $this->invitationService->validateInvitationCode($request->code);

        if (!$invitation) {
            return $this->handleBusinessError(
                'Invalid or expired invitation code',
                404
            );
        }

        return $this->sendSuccess([
            'valid' => true,
            'inviter' => [
                'name' => $invitation->inviter->name,
            ],
            'expires_at' => $invitation->expires_at,
        ]);
    }
}
