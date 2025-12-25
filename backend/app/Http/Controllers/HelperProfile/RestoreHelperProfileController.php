<?php

namespace App\Http\Controllers\HelperProfile;

use App\Enums\HelperProfileStatus;
use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use Illuminate\Http\Request;

/**
 * @OA\Post(
 *     path="/helper-profiles/{id}/restore",
 *     summary="Restore an archived helper profile",
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
 *         description="Helper profile restored successfully",
 *
 *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Unauthorized"
 *     )
 * )
 */
class RestoreHelperProfileController extends Controller
{
    public function __invoke(Request $request, HelperProfile $helperProfile)
    {
        $this->authorize('update', $helperProfile);

        if ($helperProfile->status !== HelperProfileStatus::ARCHIVED) {
            return response()->json([
                'message' => 'Only archived profiles can be restored.',
            ], 400);
        }

        $helperProfile->update([
            'status' => HelperProfileStatus::ACTIVE,
            'restored_at' => now(),
        ]);

        return response()->json(['data' => $helperProfile->load('photos', 'city')]);
    }
}
