<?php

declare(strict_types=1);

namespace App\Http\Controllers\Invitation;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Services\InvitationService;
use App\Services\WaitlistService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesErrors;
use App\Traits\HandlesValidation;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/invitations',
    summary: 'Generate a new invitation',
    description: 'Create a new invitation code for the authenticated user.',
    tags: ['Invitations'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: false,
        description: 'Optional invitation parameters',
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'email', type: 'string', format: 'email', nullable: true),
                new OA\Property(property: 'expires_at', type: 'string', format: 'datetime', nullable: true, example: '2024-12-31T23:59:59Z'),
                new OA\Property(property: 'allow_duplicate', type: 'boolean', default: false),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'Invitation created successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string', example: 'Invitation created successfully'),
                    new OA\Property(
                        property: 'data',
                        type: 'object',
                        properties: [
                            new OA\Property(property: 'id', type: 'integer'),
                            new OA\Property(property: 'code', type: 'string'),
                            new OA\Property(property: 'email', type: 'string', format: 'email', nullable: true),
                            new OA\Property(property: 'status', type: 'string', example: 'pending'),
                            new OA\Property(property: 'expires_at', type: 'string', format: 'datetime', nullable: true),
                            new OA\Property(property: 'invitation_url', type: 'string'),
                            new OA\Property(property: 'created_at', type: 'string', format: 'datetime'),
                            new OA\Property(property: 'updated_at', type: 'string', format: 'datetime'),
                        ]
                    ),
                ]
            )
        ),
        new OA\Response(
            response: 429,
            description: 'Rate limit exceeded',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string', example: 'Daily invitation limit exceeded'),
                ]
            )
        ),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
    ]
)]
class StoreInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesErrors;
    use HandlesValidation;

    public function __construct(
        private InvitationService $invitationService
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        // Check rate limiting
        if (! $this->invitationService->canUserGenerateInvitation($user)) {
            return $this->handleRateLimit(
                'Failed to generate invitation. You may have reached your daily limit.'
            );
        }

        $validated = $this->validateWithErrorHandling($request, [
            'email' => $this->emailValidationRules(false),
            'expires_at' => ['nullable', 'date', 'after:now'],
            'allow_duplicate' => ['sometimes', 'boolean'],
        ]);

        try {
            return DB::transaction(function () use ($user, $validated): JsonResponse {
                $user->newQuery()->whereKey($user->id)->lockForUpdate()->firstOrFail();
                $email = isset($validated['email'])
                    ? mb_strtolower(trim((string) $validated['email']))
                    : null;
                $accessToken = $user->currentAccessToken();
                $enforceMcpDuplicateGuard = $accessToken instanceof PersonalAccessToken
                    && $accessToken->can('invitations:write');
                if ($enforceMcpDuplicateGuard && $email !== null
                    && ! (bool) ($validated['allow_duplicate'] ?? false)) {
                    $existingIds = Invitation::query()
                        ->where('inviter_user_id', $user->id)
                        ->where('status', 'pending')
                        ->whereRaw('LOWER(email) = ?', [$email])
                        ->orderBy('id')
                        ->pluck('id')
                        ->map(static fn (mixed $id): int => (int) $id)
                        ->all();
                    if ($existingIds !== []) {
                        return response()->json([
                            'success' => false,
                            'data' => [
                                'code' => 'duplicate_candidate',
                                'existing_invitation_ids' => $existingIds,
                            ],
                            'message' => 'A pending invitation already exists for this email.',
                            'error' => 'duplicate_invitation',
                        ], 409);
                    }
                }

                $expiresAt = isset($validated['expires_at'])
                    ? Carbon::parse((string) $validated['expires_at'])
                    : null;

                if ($email !== null) {
                    $waitlistService = app(WaitlistService::class);
                    if ($waitlistService->isEmailOnWaitlist($email)) {
                        $invitation = $waitlistService->inviteFromWaitlist($email, $user);
                    } else {
                        $invitation = $this->invitationService->generateAndSendInvitation($user, $email, $expiresAt);
                    }
                } else {
                    $invitation = $this->invitationService->generateInvitation($user, $expiresAt);
                }

                return $this->sendSuccess([
                    'id' => $invitation->id,
                    'code' => $invitation->code,
                    'email' => $invitation->email,
                    'status' => $invitation->status,
                    'expires_at' => $invitation->expires_at,
                    'invitation_url' => $invitation->getInvitationUrl(),
                    'created_at' => $invitation->created_at,
                    'updated_at' => $invitation->updated_at,
                ], 201);
            });
        } catch (\Exception $e) {
            return $this->handleException($e, 'Failed to create invitation');
        }
    }
}
