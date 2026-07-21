<?php

declare(strict_types=1);

namespace App\Http\Controllers\HelperProfile;

use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Symfony\Component\HttpFoundation\Response;

class DeleteHelperProfilePhotoController extends Controller
{
    use ApiResponseTrait;
    use HandlesOfflineVersionChecks;

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
    public function __invoke(Request $request, HelperProfile $helperProfile, int $photo): JsonResponse|Response
    {
        $this->authorize('update', $helperProfile);
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $helperProfile)) {
            return $conflict;
        }

        /** @var Media|null $media */
        $media = $helperProfile->getMedia('photos')->firstWhere('id', $photo);

        if (! $media) {
            return $this->sendError(__('messages.not_found'), 404);
        }

        $media->delete();

        return $this->sendNoContent();
    }
}
