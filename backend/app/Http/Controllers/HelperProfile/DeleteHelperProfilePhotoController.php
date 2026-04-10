<?php

declare(strict_types=1);

namespace App\Http\Controllers\HelperProfile;

use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use OpenApi\Attributes as OA;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class DeleteHelperProfilePhotoController extends Controller
{
    use \App\Traits\ApiResponseTrait;

    #[OA\Delete(
        path: '/helper-profiles/{helper_profile}/photos/{photo}',
        summary: 'Delete a helper profile photo',
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
                description: 'The ID of the photo to delete',
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(response: 204, description: 'Photo deleted successfully'),
            new OA\Response(response: 403, description: 'Forbidden'),
            new OA\Response(response: 404, description: 'Not found'),
        ]
    )]
    public function __invoke(HelperProfile $helperProfile, $photo)
    {
        $this->authorize('update', $helperProfile);

        /** @var Media|null $media */
        $media = $helperProfile->getMedia('photos')->firstWhere('id', (int) $photo);

        if (! $media) {
            abort(404);
        }

        $media->delete();

        return $this->sendNoContent();
    }
}
