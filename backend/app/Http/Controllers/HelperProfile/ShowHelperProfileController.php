<?php

declare(strict_types=1);

namespace App\Http\Controllers\HelperProfile;

use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/helper-profiles/{id}',
    summary: 'Get a specific helper profile',
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
            description: 'The helper profile',
            content: new OA\JsonContent(ref: '#/components/schemas/HelperProfileResponse')
        ),
        new OA\Response(
            response: 404,
            description: 'Helper profile not found'
        ),
    ]
)]
class ShowHelperProfileController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, HelperProfile $helperProfile)
    {
        $user = $request->user();

        // Check visibility: owner can always view, or user has a pet with a response from this helper
        if ($helperProfile->isVisibleToUser($user)) {
            $helperProfile->load([
                'photos',
                'user',
                'petTypes',
                'cities',
                'placementResponses' => function ($query) use ($helperProfile): void {
                    // Helpers can cancel and re-respond, which creates multiple rows for the same
                    // placement_request_id. For profile views, only show the latest response per request.
                    $query->whereIn('id', function ($subQuery) use ($helperProfile): void {
                        $subQuery
                            ->selectRaw('MAX(id)')
                            ->from('placement_request_responses')
                            ->where('helper_profile_id', $helperProfile->id)
                            ->groupBy('placement_request_id');
                    });
                    $query->with([
                        'placementRequest.pet.petType',
                        'placementRequest.user:id,name',
                        'placementRequest.transferRequests',
                    ]);
                },
            ]);

            return $this->sendSuccess($helperProfile);
        }

        return $this->sendError(__('messages.forbidden'), 403);
    }
}
