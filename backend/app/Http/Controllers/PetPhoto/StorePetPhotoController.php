<?php

declare(strict_types=1);

namespace App\Http\Controllers\PetPhoto;

use App\Enums\PetRelationshipType;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\User;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

#[OA\Post(
    path: '/api/pets/{pet}/photos',
    summary: 'Upload a photo for a specific pet',
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
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\MediaType(
            mediaType: 'multipart/form-data',
            schema: new OA\Schema(
                properties: [
                    new OA\Property(
                        property: 'photo',
                        type: 'string',
                        format: 'binary',
                        description: 'The photo file (max 10MB, jpeg, png, jpg, gif, svg)'
                    ),
                ]
            )
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Photo uploaded successfully',
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
            response: 422,
            description: 'Validation error or feature not available for pet type'
        ),
    ]
)]
class StorePetPhotoController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __construct(
        protected PetCapabilityService $capabilityService
    ) {}

    public function __invoke(Request $request, Pet $pet)
    {
        $this->authorizeUser($request, 'update', $pet);
        $this->ensurePetCapability($pet, 'photos');

        $this->validateWithErrorHandling($request, [
            'photo' => $this->imageValidationRules(),
        ]);

        // Add new photo to MediaLibrary (append; do not clear to support multiple photos)
        $media = $pet->addMediaFromRequest('photo')
            ->toMediaCollection('photos');

        // Set the newly uploaded photo as primary by moving it to first position
        Media::setNewOrder(
            collect([$media->id])
                ->merge($pet->getMedia('photos')->where('id', '!=', $media->id)->pluck('id'))
                ->toArray()
        );

        // Refresh pet with updated relationships and clear media cache
        $pet->load('petType');
        $pet->refresh();
        // Clear media collection cache to get fresh photos
        $pet->unsetRelation('media');

        // Build viewer permission flags for response
        /** @var User $user */
        $user = $request->user();
        $isOwner = $pet->isOwnedBy($user);
        $canEdit = $pet->canBeEditedBy($user);
        $isViewer = $pet->hasRelationshipWith($user, PetRelationshipType::VIEWER);

        $viewerPermissions = [
            'can_edit' => $canEdit,
            'can_view_contact' => ! $isOwner,
            'is_owner' => $isOwner,
            'is_viewer' => $isViewer,
        ];
        $pet->setAttribute('viewer_permissions', $viewerPermissions);

        return $this->sendSuccess($pet);
    }
}
