<?php

namespace App\Http\Controllers;

use App\Models\Cat;
use App\Services\FileUploadService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CatPhotoController extends Controller
{
    use ApiResponseTrait;
    protected $fileUploadService;

    public function __construct(FileUploadService $fileUploadService)
    {
        $this->fileUploadService = $fileUploadService;
    }

    /**
     * @OA\Post(
     *     path="/api/cats/{cat}/photos",
     *     summary="Upload a photo for a specific cat",
     *     tags={"Cat Photos"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="cat",
     *         in="path",
     *         required=true,
     *         description="ID of the cat",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 @OA\Property(
     *                     property="photo",
     *                     type="string",
     *                     format="binary",
     *                     description="The photo file (max 2MB, jpeg, png, jpg, gif, svg)"
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Photo uploaded successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Cat")
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
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function store(Request $request, Cat $cat)
    {
        $this->authorize('update', $cat);

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:10240', // 10MB
        ]);

        $file = $request->file('photo');
        $size = $file->getSize();
        $mimeType = $file->getMimeType();
        $path = $this->fileUploadService->uploadCatPhoto($file, $cat);
        $filename = basename($path);

        $photo = $cat->photos()->create([
            'path' => $path,
            'cat_id' => $cat->id,
            'filename' => $filename,
            'size' => $size,
            'mime_type' => $mimeType,
            'created_by' => Auth::id(),
        ]);

        // Refresh cat with new photo relationship
        $cat->load('photo', 'photos');
        return $this->sendSuccess($cat);
    }

    /**
     * @OA\Delete(
     *     path="/api/cats/{cat}/photos",
     *     summary="Delete a photo for a specific cat",
     *     tags={"Cat Photos"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="cat",
     *         in="path",
     *         required=true,
     *         description="ID of the cat",
     *         @OA\Schema(type="integer")
     *     ),
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
     *     )
     * )
     */
        public function destroy(Cat $cat)
    {
        $this->authorize('update', $cat);

        if ($cat->photo) {
            $this->fileUploadService->delete($cat->photo->path);
            $cat->photo->delete();
        }

        return $this->sendSuccess(null, 204);
    }
}