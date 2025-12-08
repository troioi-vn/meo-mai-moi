<?php

namespace App\Http\Controllers\HelperProfile;

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

        // Get helper profiles owned by the user
        $ownedProfileIds = HelperProfile::where('user_id', $user->id)->pluck('id');

        // Get helper profiles that responded to user's placement requests
        $respondedProfileIds = HelperProfile::query()
            ->whereHas('transferRequests', function ($query) use ($user) {
                $query->whereHas('placementRequest', function ($prQuery) use ($user) {
                    $prQuery->whereHas('pet', function ($petQuery) use ($user) {
                        $petQuery->where('user_id', $user->id);
                    });
                });
            })
            ->pluck('id');

        // Merge and get unique IDs
        $visibleProfileIds = $ownedProfileIds->merge($respondedProfileIds)->unique();

        $helperProfiles = HelperProfile::with('photos', 'petTypes')
            ->whereIn('id', $visibleProfileIds)
            ->get();

        return response()->json(['data' => $helperProfiles]);
    }
}
