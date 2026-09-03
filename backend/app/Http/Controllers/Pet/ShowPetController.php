<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\User;
use App\Services\Pet\PetProfilePrivacyService;
use App\Services\PetAccessService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/pets/{id}',
    summary: 'Get a specific pet',
    tags: ['Pets'],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the pet',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'The pet',
            content: new OA\JsonContent(ref: '#/components/schemas/PetResponse')
        ),
        new OA\Response(
            response: 404,
            description: 'Pet not found'
        ),
    ]
)]
class ShowPetController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __construct(
        private readonly PetAccessService $petAccess,
        private readonly PetProfilePrivacyService $privacy,
    ) {}

    public function __invoke(Request $request, Pet $pet): JsonResponse
    {
        // Load placement requests and nested relations needed for the view
        $pet->load([
            'placementRequests.responses.helperProfile.user',
            'placementRequests.responses.transferRequest',
            'petType',
            'categories',
            'relationships.user',
            'city',
        ]);

        /** @var User|null $user */
        $user = $this->authorizeUser($request, 'view', $pet);

        if ($user instanceof User) {
            $pet->setAttribute('viewer_permissions', $this->petAccess->viewerPermissions($user, $pet));
        }

        // Shape applicant/member PII by viewer. Privileged viewers (pet
        // owner/editor or placement-request creator) get the payload exactly
        // as serialized; everyone else gets redacted nested user/profile data.
        $data = $this->privacy->redactPetArray($pet->toArray(), $user, $pet);

        return $this->sendSuccess($data);
    }
}
