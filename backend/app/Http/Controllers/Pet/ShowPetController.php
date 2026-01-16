<?php

namespace App\Http\Controllers\Pet;

use App\Enums\PetRelationshipType;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
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
            content: new OA\JsonContent(ref: '#/components/schemas/Pet')
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

    public function __invoke(Request $request, Pet $pet)
    {
        // Load placement requests and nested relations needed for the view
        $pet->load([
            'placementRequests.responses.helperProfile.user',
            'placementRequests.responses.transferRequest',
            'petType',
            'categories',
            'relationships.user',
        ]);

        // Resolve user and authorize access
        /** @var \App\Models\User|null $user */
        $user = $this->authorizeUser($request, 'view', $pet);
        $isAdmin = $this->hasRole($user, ['admin', 'super_admin']);
        $isOwner = $user ? $pet->isOwnedBy($user) : false;
        $isEditor = $user ? $pet->canBeEditedBy($user) : false;
        $isViewer = $user ? $pet->hasRelationshipWith($user, PetRelationshipType::VIEWER) : false;

        $viewerPermissions = [
            'can_edit' => $isOwner || $isAdmin || $isEditor,
            'can_view_contact' => $isAdmin || ($user && ! $isOwner),
            'is_owner' => $isOwner,
            'is_viewer' => $isViewer,
        ];
        $pet->setAttribute('viewer_permissions', $viewerPermissions);

        return $this->sendSuccess($pet);
    }
}
