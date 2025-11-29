<?php

namespace App\Http\Controllers\PetPhoto;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;

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
class StorePetPhotoController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __construct(
        protected PetCapabilityService $capabilityService
    ) {}

    public function __invoke(Request $request, Pet $pet)
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
}
