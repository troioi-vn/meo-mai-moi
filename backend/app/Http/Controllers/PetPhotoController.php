<?php

namespace App\Http\Controllers;

use App\Models\Pet;
use App\Services\FileUploadService;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PetPhotoController extends Controller
{
    use ApiResponseTrait, HandlesAuthentication, HandlesPetResources, HandlesValidation;

    protected FileUploadService $fileUploadService;

    protected PetCapabilityService $capabilityService;

    public function __construct(FileUploadService $fileUploadService, PetCapabilityService $capabilityService)
    {
        $this->fileUploadService = $fileUploadService;
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
        $this->authorizeUser($request, 'update', $pet);
        $this->ensurePetCapability($pet, 'photos');

        $this->validateWithErrorHandling($request, [
            'photo' => $this->imageValidationRules(),
        ]);

        $file = $request->file('photo');
        $size = $file->getSize();
        $mimeType = $file->getMimeType();
        $path = $this->fileUploadService->uploadPetPhoto($file, $pet);
        $filename = basename($path);

        $pet->photos()->create([
            'path' => $path,
            'pet_id' => $pet->id,
            'filename' => $filename,
            'size' => $size,
            'mime_type' => $mimeType,
            'created_by' => Auth::id(),
        ]);

        // Refresh pet with new photo relationship
        $pet->load('photo', 'photos', 'petType');

        return $this->sendSuccess($pet);
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
     *         description="ID of the photo",
     *
     *         @OA\Schema(type="integer")
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

        // Find the photo that belongs to this pet
        /** @var \App\Models\PetPhoto $photoModel */
        $photoModel = $pet->photos()->findOrFail($photo);

        // Delete the file from storage
        $this->fileUploadService->delete($photoModel->path);

        // Delete the photo record
        $photoModel->delete();

        return $this->sendSuccess(null, 204);
    }
}
