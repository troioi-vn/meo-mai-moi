<?php

declare(strict_types=1);

namespace App\Http\Controllers\ResourceInvitation;

use App\Enums\ResourceInvitationType;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\ResourceInvitation;
use App\Models\User;
use App\Services\ResourceInvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

#[OA\Delete(
    path: '/api/pets/{pet}/invitations/{invitation}',
    summary: 'Revoke a pet resource invitation',
    tags: ['Resource Invitations'],
    parameters: [
        new OA\Parameter(
            name: 'pet',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
        new OA\Parameter(
            name: 'invitation',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(response: 204, description: 'Invitation revoked'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 410, description: 'Invitation is no longer valid'),
    ]
)]
class RevokePetResourceInvitationController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;

    public function __invoke(
        Request $request,
        Pet $pet,
        ResourceInvitation $invitation,
        ResourceInvitationService $service
    ): JsonResponse|Response {
        /** @var User $user */
        $user = $this->requireAuth($request);

        if (! $user->can('revokeInvitation', $pet)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $invitation->loadMissing('petDetail');

        if (
            $invitation->type !== ResourceInvitationType::PET
            || $invitation->petDetail?->pet_id !== $pet->id
        ) {
            return $this->sendError(__('messages.not_found'), 404);
        }

        if ($conflictResponse = $this->rejectUnlessBaseVersionMatches($request, $invitation)) {
            return $conflictResponse;
        }

        try {
            $service->revoke($invitation);
        } catch (RuntimeException) {
            return $this->sendError(__('resource_invitations.no_longer_valid'), 410);
        }

        $pet->touch();

        return $this->sendNoContent();
    }
}
