<?php

namespace App\Http\Controllers;

use App\Models\Pet;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;

class PetPhotoController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    protected PetCapabilityService $capabilityService;

    public function __construct(PetCapabilityService $capabilityService)
    {
        $this->capabilityService = $capabilityService;
    }

    /**
     * @OA\Post(
     *     path="/api/pets/{pet}/photos",
     *     summary="Upload a photo for a specific pet",
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
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *
     *             @OA\Schema(
     *
     *                 @OA\Property(
     *                     property="photo",
     *                     type="string",
     *                     format="binary",
     *                     description="The photo file (max 10MB, jpeg, png, jpg, gif, svg)"
     *                 )
     *             )
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Photo uploaded successfully",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="data", ref="#/components/schemas/Pet")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Unauthorized"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error or feature not available for pet type"
     *     )
     * )
     */
    public function store(Request $request, Pet $pet)
    {
        \Log::info('Pet photo upload request received', [
            'pet_id' => $pet->id,
            'user_id' => $request->user()->id,
            'has_file' => $request->hasFile('photo'),
            'files' => $request->allFiles(),
        ]);

        $this->authorizeUser($request, 'update', $pet);
        $this->ensurePetCapability($pet, 'photos');

        $this->validateWithErrorHandling($request, [
            'photo' => $this->imageValidationRules(),
        ]);

        \Log::info('Pet photo validation passed', [
            'pet_id' => $pet->id,
            'file_info' => $request->file('photo') ? [
                'name' => $request->file('photo')->getClientOriginalName(),
                'size' => $request->file('photo')->getSize(),
                'mime' => $request->file('photo')->getMimeType(),
            ] : null,
        ]);

        // Add new photo to MediaLibrary (append; do not clear to support multiple photos)
        $media = $pet->addMediaFromRequest('photo')
            ->toMediaCollection('photos');

        \Log::info('Pet photo uploaded successfully', [
            'pet_id' => $pet->id,
            'media_id' => $media->id,
            'media_url' => $media->getUrl(),
        ]);

        // Refresh pet with updated relationships and photo_url from accessor
        $pet->load('petType');
        $pet->refresh();

        // Ensure photo_url is included in response (similar to User fix)
        $petData = $pet->toArray();
        $petData['photo_url'] = $pet->photo_url;

        return $this->sendSuccess($petData);
    }

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
    public function destroy(Pet $pet, $photo)
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
