<?php

declare(strict_types=1);

namespace App\Http\Controllers\ResourceInvitation;

use App\Enums\ResourceInvitationType;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\User;
use App\Services\ResourceInvitationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/pets/{pet}/invitations',
    summary: 'List pending resource invitations for a pet',
    tags: ['Resource Invitations'],
    parameters: [
        new OA\Parameter(
            name: 'pet',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Pending invitations',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean'),
                    new OA\Property(
                        property: 'data',
                        type: 'array',
                        items: new OA\Items(ref: '#/components/schemas/ManagedPetResourceInvitation')
                    ),
                    new OA\Property(property: 'message', type: 'string', nullable: true),
                ]
            )
        ),
        new OA\Response(response: 403, description: 'Forbidden'),
    ]
)]
class ListPetResourceInvitationsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, Pet $pet, ResourceInvitationService $service): JsonResponse
    {
        /** @var User $user */
        $user = $this->requireAuth($request);

        if (! $user->can('viewInvitations', $pet)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        $invitations = $service->listPendingForTarget(ResourceInvitationType::PET, $pet);

        return $this->sendSuccess(
            $service->serializePendingList(ResourceInvitationType::PET, $invitations)
        );
    }
}
