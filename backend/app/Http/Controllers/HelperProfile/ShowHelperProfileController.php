<?php

namespace App\Http\Controllers\HelperProfile;

use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use Illuminate\Http\Request;

/**
 * @OA\Get(
 *     path="/helper-profiles/{id}",
 *     summary="Get a specific helper profile",
 *     tags={"Helper Profiles"},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="ID of the helper profile",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="The helper profile",
 *
 *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
 *     ),
 *
 *     @OA\Response(
 *         response=404,
 *         description="Helper profile not found"
 *     )
 * )
 */
class ShowHelperProfileController extends Controller
{
    public function __invoke(Request $request, HelperProfile $helperProfile)
    {
        $user = $request->user();
        // Allow viewing if the profile is public or owned by the requester
        if ($helperProfile->is_public || ($user && $helperProfile->user_id === $user->id)) {
            return response()->json(['data' => $helperProfile->load('photos', 'user', 'petTypes')]);
        }

        return response()->json(['message' => 'Forbidden'], 403);
    }
}
