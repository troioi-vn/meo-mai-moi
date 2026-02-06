<?php

declare(strict_types=1);

namespace App\Http\Controllers\HelperProfile;

use App\Enums\HelperProfileStatus;
use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/helper-profiles/{id}/restore',
    summary: 'Restore an archived helper profile',
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
            response: 200,
            description: 'Helper profile restored successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/HelperProfileResponse')
        ),
        new OA\Response(
            response: 403,
            description: 'Unauthorized',
            content: new OA\JsonContent(ref: '#/components/schemas/ApiErrorResponse')
        ),
    ]
)]
class RestoreHelperProfileController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, HelperProfile $helperProfile)
    {
        $this->authorize('update', $helperProfile);

        if ($helperProfile->status !== HelperProfileStatus::ARCHIVED) {
            return $this->sendError(__('messages.helper.only_archived_can_be_restored'), 400);
        }

        $helperProfile->update([
            'status' => HelperProfileStatus::ACTIVE,
            'restored_at' => now(),
        ]);

        return $this->sendSuccess($helperProfile->load('photos', 'cities'));
    }
}
