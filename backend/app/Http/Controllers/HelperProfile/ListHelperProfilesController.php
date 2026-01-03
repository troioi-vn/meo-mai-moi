<?php

namespace App\Http\Controllers\HelperProfile;

use App\Enums\HelperProfileStatus;
use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/helper-profiles",
 *     summary="List helper profiles",
 *     tags={"Helper Profiles"},
 *
 *     @OA\Response(
 *         response=200,
 *         description="A list of helper profiles",
 *
 *         @OA\JsonContent(
 *             type="array",
 *
 *             @OA\Items(ref="#/components/schemas/HelperProfile")
 *         )
 *     )
 * )
 */
class ListHelperProfilesController extends Controller
{
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
            ->whereHas('placementResponses', function ($query) use ($user) {
                $query->whereHas('placementRequest', function ($prQuery) use ($user) {
                    $prQuery->where('user_id', $user->id);
                });
            })
            ->pluck('id');

        // Merge and get unique IDs
        $visibleProfileIds = $ownedProfileIds->merge($respondedProfileIds)->unique();

        $helperProfiles = HelperProfile::with('photos', 'petTypes', 'cities')
            ->whereIn('id', $visibleProfileIds)
            ->get();

        return response()->json(['data' => $helperProfiles]);
    }
}
