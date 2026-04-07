<?php

declare(strict_types=1);

namespace App\Http\Controllers\HelperProfile;

use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use App\Traits\ApiResponseTrait;
use OpenApi\Attributes as OA;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

#[OA\Post(
    path: '/helper-profiles/{helper_profile}/photos/{photo}/set-primary',
    summary: 'Set a specific photo as the main photo for a helper profile',
    tags: ['Helper Profiles'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'helper_profile',
            in: 'path',
            required: true,
            description: 'The ID of the helper profile',
            schema: new OA\Schema(type: 'integer')
        ),
        new OA\Parameter(
            name: 'photo',
            in: 'path',
            required: true,
            description: 'The ID of the photo to set as main',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Photo set as main successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/HelperProfileResponse')
        ),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Photo not found'),
    ]
)]
class SetPrimaryHelperProfilePhotoController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(HelperProfile $helperProfile, int $photo)
    {
        $this->authorize('update', $helperProfile);

        $media = $helperProfile->getMedia('photos')->firstWhere('id', $photo);

        if (! $media) {
            return $this->sendError(__('messages.pets.photo_not_found'), 404);
        }

        Media::setNewOrder(
            collect([$media->id])
                ->merge($helperProfile->getMedia('photos')->where('id', '!=', $photo)->pluck('id'))
                ->toArray()
        );

        $helperProfile->refresh();

        return $this->sendSuccess($helperProfile->load('media', 'cities', 'petTypes', 'user'));
    }
}
