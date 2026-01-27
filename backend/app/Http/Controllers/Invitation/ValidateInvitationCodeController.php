<?php

declare(strict_types=1);

namespace App\Http\Controllers\Invitation;

use App\Http\Controllers\Controller;
use App\Services\InvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesErrors;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

/**
 * Validate an invitation code (public endpoint for registration)
 */
class ValidateInvitationCodeController extends Controller
{
    use ApiResponseTrait;
    use HandlesErrors;
    use HandlesValidation;

    public function __construct(
        private InvitationService $invitationService
    ) {}

    #[OA\Post(
        path: '/api/invitations/validate',
        summary: 'Validate an invitation code',
        tags: ['Invitations'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['code'],
                properties: [
                    new OA\Property(property: 'code', type: 'string', example: 'ABC-123'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Validation result',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [
                        new OA\Property(property: 'data', properties: [
                            new OA\Property(property: 'valid', type: 'boolean'),
                            new OA\Property(property: 'inviter', properties: [
                                new OA\Property(property: 'name', type: 'string'),
                            ], type: 'object'),
                            new OA\Property(property: 'expires_at', type: 'string', format: 'date-time', nullable: true),
                        ], type: 'object'),
                    ]
                )
            ),
            new OA\Response(response: 404, description: 'Invalid or expired code'),
            new OA\Response(response: 422, description: 'Validation error'),
        ]
    )]
    public function __invoke(Request $request)
    {
        $this->validateWithErrorHandling($request, [
            'code' => $this->textValidationRules(),
        ]);

        $invitation = $this->invitationService->validateInvitationCode($request->code);

        if (! $invitation) {
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
