<?php

namespace App\Http\Controllers\PetPhoto;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;

/**
 * @OA\Delete(
 *     path="/api/pets/{pet}/photos/{photo}",
 *     summary="Delete a specific photo for a pet",
 *     tags={"Pet Photos"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(
 *         name="pet",
 *         in="path",
 *         required=true,
 *         description="ID of the pet",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\Parameter(
 *         name="photo",
 *         in="path",
 *         required=true,
 *         description="ID of the photo or 'current' to delete the current photo",
 *
 *         @OA\Schema(type="string")
 *     ),
 *
 *     @OA\Response(
 *         response=204,
 *         description="Photo deleted successfully"
 *     ),
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     ),
 *     @OA\Response(
 *         response=403,
 *         description="Unauthorized"
 *     ),
 *     @OA\Response(
 *         response=404,
 *         description="Photo not found"
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Feature not available for pet type"
 *     )
 * )
 */
class DeletePetPhotoController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected PetCapabilityService $capabilityService
    ) {}

    public function __invoke(Pet $pet, $photo)
    {
        $this->authorize('update', $pet);

        // Ensure this pet type supports photos
        $this->capabilityService->ensure($pet, 'photos');

        // Handle 'current' photo deletion
        if ($photo === 'current') {
            $media = $pet->getFirstMedia('photos');
        } else {
            // Find the media that belongs to this pet's photos collection
            $media = $pet->getMedia('photos')->firstWhere('id', (int) $photo);
        }

        if (! $media) {
            return $this->sendError('Photo not found.', 404);
        }

        // Delete the media (this will also delete the file)
        $media->delete();

        return $this->sendSuccess(null, 204);
    }
}
