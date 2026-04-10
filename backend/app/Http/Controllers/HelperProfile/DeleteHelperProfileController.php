<?php

declare(strict_types=1);

namespace App\Http\Controllers\HelperProfile;

use App\Enums\HelperProfileStatus;
use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Log;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/helper-profiles/{id}',
    summary: 'Delete a helper profile',
    tags: ['Helper Profiles'],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the helper profile',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    responses: [
        new OA\Response(
            response: 204,
            description: 'Helper profile deleted successfully'
        ),
        new OA\Response(
            response: 400,
            description: 'Cannot delete profile with associated placement requests',
            content: new OA\JsonContent(ref: '#/components/schemas/ApiErrorResponse')
        ),
        new OA\Response(
            response: 403,
            description: 'Unauthorized',
            content: new OA\JsonContent(ref: '#/components/schemas/ApiErrorResponse')
        ),
    ]
)]
class DeleteHelperProfileController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(HelperProfile $helperProfile)
    {
        $this->authorize('delete', $helperProfile);

        if ($helperProfile->hasPlacementRequests()) {
            return $this->sendError(__('messages.helper.cannot_delete_with_requests'), 400);
        }

        try {
            $helperProfile->clearMediaCollection('photos');
        } catch (\Throwable $e) {
            Log::warning('Failed to clear helper profile media collection', [
                'helper_profile_id' => $helperProfile->id,
                'error' => $e->getMessage(),
            ]);
        }

        $helperProfile->update([
            'status' => HelperProfileStatus::DELETED,
        ]);

        $helperProfile->delete();

        return $this->sendNoContent();
    }
}
