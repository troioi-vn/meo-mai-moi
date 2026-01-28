<?php

declare(strict_types=1);

namespace App\Http\Controllers\HelperProfile;

use App\Enums\HelperProfileStatus;
use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/helper-profiles',
    summary: 'List helper profiles',
    tags: ['Helper Profiles'],
    responses: [
        new OA\Response(
            response: 200,
            description: 'A list of helper profiles',
            content: new OA\JsonContent(ref: '#/components/schemas/HelperProfileArrayResponse')
        ),
    ]
)]
class ListHelperProfilesController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $user = $request->user();

        // Get helper profiles owned by the user (excluding deleted)
        $ownedProfileIds = HelperProfile::where('user_id', $user->id)
            ->where('status', '!=', HelperProfileStatus::DELETED)
            ->pluck('id');

        // Get helper profiles that responded to user's placement requests (excluding deleted)
        $respondedProfileIds = HelperProfile::query()
            ->where('status', '!=', HelperProfileStatus::DELETED)
            ->whereHas('placementResponses', function ($query) use ($user): void {
                $query->whereHas('placementRequest', function ($prQuery) use ($user): void {
                    $prQuery->where('user_id', $user->id);
                });
            })
            ->pluck('id');

        // Merge and get unique IDs
        $visibleProfileIds = $ownedProfileIds->merge($respondedProfileIds)->unique();

        $helperProfiles = HelperProfile::with('photos', 'petTypes', 'cities')
            ->whereIn('id', $visibleProfileIds)
            ->get();

        return $this->sendSuccess($helperProfiles);
    }
}
