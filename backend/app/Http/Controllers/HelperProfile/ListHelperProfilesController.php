<?php

namespace App\Http\Controllers\HelperProfile;

use App\Http\Controllers\Controller;
use App\Models\HelperProfile;

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
    public function __invoke()
    {
        $helperProfiles = HelperProfile::with('photos', 'petTypes')->where('is_public', true)->get();

        return response()->json(['data' => $helperProfiles]);
    }
}
