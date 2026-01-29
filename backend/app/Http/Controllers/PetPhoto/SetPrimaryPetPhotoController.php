<?php

declare(strict_types=1);

namespace App\Http\Controllers\PetPhoto;

use App\Enums\PetRelationshipType;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

#[OA\Post(
    path: '/api/pets/{pet}/photos/{photo}/set-primary',
    summary: 'Set a specific photo as the primary (avatar) photo for a pet',
    tags: ['Pet Photos'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'pet',
            in: 'path',
            required: true,
            description: 'ID of the pet',
            schema: new OA\Schema(type: 'integer')
        ),
        new OA\Parameter(
            name: 'photo',
            in: 'path',
            required: true,
            description: 'ID of the photo to set as primary',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Photo set as primary successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/Pet'),
                ]
            )
        ),
        new OA\Response(
            response: 401,
            description: 'Unauthenticated'
        ),
        new OA\Response(
            response: 403,
            description: 'Unauthorized'
        ),
        new OA\Response(
            response: 404,
            description: 'Photo not found'
        ),
        new OA\Response(
            response: 422,
            description: 'Feature not available for pet type'
        ),
    ]
)]
class SetPrimaryPetPhotoController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected PetCapabilityService $capabilityService
    ) {}

    public function __invoke(Request $request, Pet $pet, int $photo)
    {
        $this->authorize('update', $pet);

        // Ensure this pet type supports photos
        $this->capabilityService->ensure($pet, 'photos');

        // Find the media that belongs to this pet's photos collection
        $media = $pet->getMedia('photos')->firstWhere('id', $photo);

        if (! $media) {
            return $this->sendError('Photo not found.', 404);
        }

        // Move the selected photo to the first position (making it primary)
        // Spatie MediaLibrary uses order_column for ordering
        Media::setNewOrder(
            collect([$media->id])
                ->merge($pet->getMedia('photos')->where('id', '!=', $photo)->pluck('id'))
                ->toArray()
        );

        // Refresh pet with updated photo order
        $pet->load('petType');
        $pet->refresh();

        // Build viewer permission flags for response
        /** @var \App\Models\User $user */
        $user = $request->user();
        $isAdmin = $user->hasRole(['admin', 'super_admin']);
        $isOwner = $pet->isOwnedBy($user);
        $canEdit = $isOwner || $isAdmin || $pet->canBeEditedBy($user);
        $isViewer = $pet->hasRelationshipWith($user, PetRelationshipType::VIEWER);

        $viewerPermissions = [
            'can_edit' => $canEdit,
            'can_view_contact' => $isAdmin || ! $isOwner,
            'is_owner' => $isOwner,
            'is_viewer' => $isViewer,
        ];
        $pet->setAttribute('viewer_permissions', $viewerPermissions);

        return $this->sendSuccess($pet);
    }
}
