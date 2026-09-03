<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\User;
use App\Services\Pet\PetProfilePrivacyService;
use App\Services\PetAccessService;
use App\Services\Translation\ContentTranslationService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
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

    public function __construct(
        private readonly PetAccessService $petAccess,
        private readonly PetProfilePrivacyService $privacy,
    ) {}

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
        'description_locale',
        'status',
        'pet_type_id',
        'photo_url',
        'photos',
        'created_at',
        'updated_at',
    ];

    public function __invoke(Request $request, Pet $pet, ContentTranslationService $translationService): JsonResponse
    {
        try {
            // Check if pet is publicly viewable using the policy
            $this->authorize('view', $pet);
        } catch (AuthorizationException $exception) {
            return $this->sendError(__('messages.pets.not_public'), 403);
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
        /** @var User|null $user */
        $user = $this->resolveUser($request);

        // Build public response with whitelisted fields
        $publicData = $pet->only(self::PUBLIC_FIELDS);
        $publicData['description_translation'] = $translationService->present(
            model: $pet,
            field: 'description',
            sourceLocale: $pet->description_locale,
            text: $pet->description,
            viewerLocale: app()->getLocale(),
        );

        // Add relations
        $publicData['pet_type'] = $pet->petType;
        $publicData['categories'] = $pet->categories;
        $publicData['placement_requests'] = $pet->placementRequests->map(function ($placementRequest) use ($user, $pet, $translationService): array {
            $placementRequest->setAttribute('notes_translation', $translationService->present(
                model: $placementRequest,
                field: 'notes',
                sourceLocale: $placementRequest->notes_locale,
                text: $placementRequest->notes,
                viewerLocale: app()->getLocale(),
            ));

            $requestData = $placementRequest->toArray();

            // Privacy guard: applicant/member PII is visible only to the pet's
            // owner/editor or this request's creator. Responder names stay
            // visible to the creator; every other viewer gets redacted nested
            // user/profile data with the list and key shapes unchanged.
            $requestData = $this->privacy->redactPlacementRequestArray($requestData, $placementRequest, $user, $pet);

            return $requestData;
        })->values()->all();

        $publicData['viewer_permissions'] = $this->petAccess->publicViewerPermissions(
            $user instanceof User ? $user : null,
            $pet
        );

        return $this->sendSuccess($publicData);
    }
}
