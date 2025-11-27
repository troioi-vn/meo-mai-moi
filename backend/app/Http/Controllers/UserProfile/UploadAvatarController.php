<?php

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;

/**
 * @OA\Post(
 *     path="/api/users/me/avatar",
 *     summary="Upload or update authenticated user's avatar",
 *     tags={"User Profile"},
 *     security={{"sanctum": {}}},
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
 *                     property="avatar",
 *                     type="string",
 *                     format="binary",
 *                     description="The avatar image file (max 2MB, jpeg, png, jpg, gif, svg)"
 *                 )
 *             )
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Avatar uploaded successfully",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="Avatar uploaded successfully."),
 *             @OA\Property(property="avatar_url", type="string", example="http://localhost:8000/storage/users/avatars/user_1_1678886400.png")
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error",
 *
 *         @OA\JsonContent(
 *
 *             @OA\Property(property="message", type="string", example="Validation Error"),
 *             @OA\Property(property="errors", type="object", example={"avatar": {"The avatar must be an image."}})
 *         )
 *     ),
 *
 *     @OA\Response(
 *         response=401,
 *         description="Unauthenticated"
 *     )
 * )
 */
class UploadAvatarController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        \Log::info('Avatar upload request received', [
            'user_id' => $request->user()->id,
            'has_file' => $request->hasFile('avatar'),
            'files' => $request->allFiles(),
        ]);

        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:10240', // 10MB
        ]);

        $user = $request->user();

        \Log::info('Avatar upload validation passed', [
            'user_id' => $user->id,
            'file_info' => $request->file('avatar') ? [
                'name' => $request->file('avatar')->getClientOriginalName(),
                'size' => $request->file('avatar')->getSize(),
                'mime' => $request->file('avatar')->getMimeType(),
            ] : null,
        ]);

        // Clear existing avatar
        $user->clearMediaCollection('avatar');

        // Add new avatar to MediaLibrary
        $media = $user->addMediaFromRequest('avatar')
            ->toMediaCollection('avatar');

        \Log::info('Avatar uploaded successfully', [
            'user_id' => $user->id,
            'media_id' => $media->id,
            'media_url' => $media->getUrl(),
        ]);

        // Refresh user to get updated avatar_url from accessor
        $user->refresh();

        \Log::info('User refreshed', [
            'user_id' => $user->id,
            'avatar_url' => $user->avatar_url,
        ]);

        return $this->sendSuccess([
            'message' => 'Avatar uploaded successfully',
            'user' => $user,
            'avatar_url' => $user->avatar_url,
            'media_count' => $user->getMedia('avatar')->count(),
        ]);
    }
}
