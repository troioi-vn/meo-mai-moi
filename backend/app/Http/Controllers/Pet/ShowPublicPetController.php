<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Enums\PetRelationshipType;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/pets/{id}/view',
    summary: 'Get viewable profile of a specific pet',
    description: 'Returns whitelisted fields for view. Accessible to: pet owner, users with viewer/owner PetRelationship, helpers involved in pending transfers, and anyone when pet is lost or has active placement requests.',
    tags: ['Pets'],
    parameters: [
        new OA\Parameter(
            name: 'id',
            description: 'The ID of the pet',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'The pet view profile',
            content: new OA\JsonContent(ref: '#/components/schemas/PublicPetResponse')
        ),
        new OA\Response(
            response: 403,
            description: 'Pet is not viewable by the current user'
        ),
        new OA\Response(
            response: 404,
            description: 'Pet not found'
        ),
    ]
)]
class ShowPublicPetController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    /**
     * Whitelisted fields for public view.
     */
    private const PUBLIC_FIELDS = [
        'id',
        'name',
        'sex',
        'birthday_precision',
        'birthday_year',
        'birthday_month',
        'birthday_day',
        'country',
        'state',
        'city',
        'city_id',
        'description',
        'status',
        'pet_type_id',
        'photo_url',
        'photos',
        'created_at',
        'updated_at',
    ];

    public function __invoke(Request $request, Pet $pet)
    {
        try {
            // Check if pet is publicly viewable using the policy
            $this->authorize('view', $pet);
        } catch (AuthorizationException $exception) {
            return $this->sendError(__('messages.pets_extra.not_public'), 403);
        }

        // Load relations needed for public view
        $pet->load([
            'placementRequests.responses.helperProfile.user',
            'placementRequests.responses.transferRequest',
            'petType',
            'categories',
            'city',
        ]);

        // Resolve user and authorize access
        /** @var \App\Models\User|null $user */
        $user = $this->resolveUser($request);
        $isOwner = $user instanceof \App\Models\User && $pet->isOwnedBy($user);
        $isViewer = $user instanceof \App\Models\User && $pet->hasRelationshipWith($user, PetRelationshipType::VIEWER);

        // Build public response with whitelisted fields
        $publicData = $pet->only(self::PUBLIC_FIELDS);

        // Add relations
        $publicData['pet_type'] = $pet->petType;
        $publicData['categories'] = $pet->categories;
        $publicData['placement_requests'] = $pet->placementRequests;

        // Check if user has any active relationship
        $hasActiveRelationship = $user instanceof \App\Models\User && $pet->canBeViewedBy($user);

        // Add viewer permissions
        $publicData['viewer_permissions'] = [
            'is_owner' => $isOwner,
            'is_viewer' => $isViewer,
            'has_active_relationship' => $hasActiveRelationship,
        ];

        return $this->sendSuccess($publicData);
    }
}
