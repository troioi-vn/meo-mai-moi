<?php

declare(strict_types=1);

namespace App\Http\Controllers\HelperProfile;

use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use App\Traits\ApiResponseTrait;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/helpers/{id}',
    summary: 'Get a public helper profile',
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
            description: 'The public helper profile',
            content: new OA\JsonContent(ref: '#/components/schemas/HelperProfileResponse')
        ),
        new OA\Response(response: 404, description: 'Helper profile not found'),
    ]
)]
class ShowPublicHelperProfileController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(HelperProfile $helperProfile)
    {
        abort_unless($helperProfile->isPubliclyVisible(), 404);

        $helperProfile->load([
            'media',
            'user:id,name',
            'petTypes',
            'cities',
        ]);

        return $this->sendSuccess($helperProfile);
    }
}
