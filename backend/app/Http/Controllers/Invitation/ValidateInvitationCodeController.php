<?php

declare(strict_types=1);

namespace App\Http\Controllers\Invitation;

use App\Http\Controllers\Controller;
use App\Services\InvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesErrors;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;

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
