<?php

namespace App\Http\Controllers\HelperProfile;

use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * @OA\Delete(
 *     path="/helper-profiles/{id}",
 *     summary="Delete a helper profile",
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
 *         response=204,
 *         description="Helper profile deleted successfully"
 *     ),
 *     @OA\Response(
 *         response=403,
 *         description="Unauthorized"
 *     )
 * )
 */
class DeleteHelperProfileController extends Controller
{
    public function __invoke(HelperProfile $helperProfile)
    {
        $this->authorize('delete', $helperProfile);

        // Delete stored photo files first to avoid orphans
        $helperProfile->loadMissing('photos');
        foreach ($helperProfile->photos as $photo) {
            try {
                Storage::disk('public')->delete($photo->path);
            } catch (\Throwable $e) {
                // Log and continue; DB deletion will proceed
                Log::warning('Failed to delete helper profile photo file', [
                    'photo_id' => $photo->id,
                    'path' => $photo->path,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $helperProfile->delete();

        return response()->json(null, 204);
    }
}
