<?php

namespace App\Http\Controllers\HelperProfile;

use App\Enums\HelperProfileStatus;
use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use Illuminate\Http\Request;

/**
 * @OA\Post(
 *     path="/helper-profiles/{id}/archive",
 *     summary="Archive a helper profile",
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
 *         description="Helper profile archived successfully",
 *
 *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
 *     ),
 *
 *     @OA\Response(
 *         response=400,
 *         description="Cannot archive profile with associated placement requests"
 *     ),
 *     @OA\Response(
 *         response=403,
 *         description="Unauthorized"
 *     )
 * )
 */
class ArchiveHelperProfileController extends Controller
{
    public function __invoke(Request $request, HelperProfile $helperProfile)
    {
        $this->authorize('update', $helperProfile);

        if ($helperProfile->hasPlacementRequests()) {
            return response()->json([
                'message' => 'Cannot archive profile with associated placement requests.',
            ], 400);
        }

        $helperProfile->update([
            'status' => HelperProfileStatus::ARCHIVED,
            'archived_at' => now(),
        ]);

        return response()->json(['data' => $helperProfile->load('photos', 'city')]);
    }
}
