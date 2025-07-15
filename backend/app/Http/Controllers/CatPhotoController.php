<?php

namespace App\Http\Controllers;

use App\Models\Cat;
use App\Models\CatPhoto;
use App\Services\FileUploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="CatPhoto",
 *     title="CatPhoto",
 *     description="Cat Photo model",
 *     @OA\Property(
 *         property="id",
 *         type="integer",
 *         format="int64",
 *         description="Photo ID"
 *     ),
 *     @OA\Property(
 *         property="cat_id",
 *         type="integer",
 *         format="int64",
 *         description="ID of the cat this photo belongs to"
 *     ),
 *     @OA\Property(
 *         property="filename",
 *         type="string",
 *         description="Original filename of the photo"
 *     ),
 *     @OA\Property(
 *         property="path",
 *         type="string",
 *         description="Storage path of the photo"
 *     ),
 *     @OA\Property(
 *         property="size",
 *         type="integer",
 *         description="Size of the photo in bytes"
 *     ),
 *     @OA\Property(
 *         property="mime_type",
 *         type="string",
 *         description="MIME type of the photo"
 *     ),
 *     @OA\Property(
 *         property="created_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of photo creation"
 *     ),
 *     @OA\Property(
 *         property="updated_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of last photo update"
 *     )
 * )
 */
class CatPhotoController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/cats/{cat}/photos",
     *     summary="Upload a new photo for a cat",
     *     tags={"Cats"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="cat",
     *         in="path",
     *         required=true,
     *         description="ID of the cat to upload photo for",
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
     *                     description="The photo file (max 5MB, jpeg, png, jpg, gif, svg)"
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Photo uploaded successfully",
     *         @OA\JsonContent(ref="#/components/schemas/CatPhoto")
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden: You are not authorized to add photos to this cat."
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function store(Request $request, Cat $cat, FileUploadService $fileUploadService)
    {
        $user = $request->user();
        $role = $user ? ($user->role instanceof \BackedEnum ? $user->role->value : $user->role) : null;
        $isAdmin = $role === \App\Enums\UserRole::ADMIN->value || $role === 'admin';
        $isOwner = $user && $cat->user_id === $user->id;

        if (!$user || (!$isAdmin && !$isOwner)) {
            return response()->json([
                'message' => 'Forbidden: You are not authorized to add photos to this cat.'
            ], 403);
        }

        try {
            $validatedData = $request->validate([
                'photo' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:5120',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $e->errors(),
            ], 422);
        }

        $photoPath = $fileUploadService->uploadCatPhoto($request->file('photo'), $cat);

        return response()->json($cat->photos()->latest()->first(), 201);
    }

    /**
     * @OA\Delete(
     *     path="/api/cats/{cat}/photos/{photo}",
     *     summary="Delete a cat photo",
     *     tags={"Cats"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(
     *         name="cat",
     *         in="path",
     *         required=true,
     *         description="ID of the cat the photo belongs to",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="photo",
     *         in="path",
     *         required=true,
     *         description="ID of the photo to delete",
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
     *         description="Forbidden: You are not authorized to delete this photo."
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Photo not found"
     *     )
     * )
     */
    public function destroy(Request $request, Cat $cat, CatPhoto $photo)
    {
        if ($photo->cat_id !== $cat->id) {
            return response()->json([
                'message' => 'Photo does not belong to the specified cat.'
            ], 404);
        }

        $user = $request->user();
        $role = $user ? ($user->role instanceof \BackedEnum ? $user->role->value : $user->role) : null;
        $isAdmin = $role === \App\Enums\UserRole::ADMIN->value || $role === 'admin';
        $isOwner = $user && $cat->user_id === $user->id;

        if (!$user || (!$isAdmin && !$isOwner)) {
            return response()->json([
                'message' => 'Forbidden: You are not authorized to delete this photo.'
            ], 403);
        }

        if (Storage::disk('public')->exists($photo->path)) {
            Storage::disk('public')->delete($photo->path);
        }

        $photo->delete();

        return response()->json(null, 204);
    }
}
