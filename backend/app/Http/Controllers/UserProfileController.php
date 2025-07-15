<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Hash;
use OpenApi\Annotations as OA;
use App\Http\Requests\UpdatePasswordRequest;
use App\Http\Requests\DeleteAccountRequest;
use App\Services\FileUploadService;
use Illuminate\Support\Facades\Storage;

/**
 * @OA\Schema(
 *     schema="User",
 *     title="User",
 *     description="User model",
 *     @OA\Property(
 *         property="id",
 *         type="integer",
 *         format="int64",
 *         description="User ID"
 *     ),
 *     @OA\Property(
 *         property="name",
 *         type="string",
 *         description="User's name"
 *     ),
 *     @OA\Property(
 *         property="email",
 *         type="string",
 *         format="email",
 *         description="User's email address"
 *     ),
 *     @OA\Property(
 *         property="avatar_url",
 *         type="string",
 *         nullable=true,
 *         description="URL to the user's avatar image"
 *     ),
 *     @OA\Property(
 *         property="created_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of user creation"
 *     ),
 *     @OA\Property(
 *         property="updated_at",
 *         type="string",
 *         format="date-time",
 *         description="Timestamp of last user update"
 *     )
 * )
 */
class UserProfileController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/users/me",
     *     summary="Get authenticated user's profile",
     *     tags={"User Profile"},
     *     security={{"sanctum": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(ref="#/components/schemas/User")
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function show(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * @OA\Put(
     *     path="/api/users/me",
     *     summary="Update authenticated user's profile",
     *     tags={"User Profile"},
     *     security={{"sanctum": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name", "email"},
     *             @OA\Property(property="name", type="string", example="John Doe"),
     *             @OA\Property(property="email", type="string", format="email", example="john.doe@example.com")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(ref="#/components/schemas/User")
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Validation Error"),
     *             @OA\Property(property="errors", type="object", example={"name": {"The name field is required."}})
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function update(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users,email,' . $request->user()->id,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $e->errors(),
            ], 422);
        }

        $user = $request->user();
        $user->fill($validatedData);
        $user->save();

        return response()->json($user);
    }

    /**
     * @OA\Put(
     *     path="/api/users/me/password",
     *     summary="Update authenticated user's password",
     *     tags={"User Profile"},
     *     security={{"sanctum": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"current_password", "new_password", "new_password_confirmation"},
     *             @OA\Property(property="current_password", type="string", format="password", example="old_secret_password"),
     *             @OA\Property(property="new_password", type="string", format="password", example="new_secret_password"),
     *             @OA\Property(property="new_password_confirmation", type="string", format="password", example="new_secret_password")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Password updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Password updated successfully.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Validation Error"),
     *             @OA\Property(property="errors", type="object", example={"current_password": {"The provided password does not match your current password."}})
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function updatePassword(UpdatePasswordRequest $request)
    {
        $user = $request->user();
        $user->password = Hash::make($request->new_password);
        $user->save();

        return response()->json(['message' => 'Password updated successfully.']);
    }

    /**
     * @OA\Delete(
     *     path="/api/users/me",
     *     summary="Delete authenticated user's account",
     *     tags={"User Profile"},
     *     security={{"sanctum": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"password"},
     *             @OA\Property(property="password", type="string", format="password", example="your_current_password")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Account deleted successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Account deleted successfully.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Validation Error"),
     *             @OA\Property(property="errors", type="object", example={"password": {"The provided password does not match your current password."}})
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function destroy(DeleteAccountRequest $request)
    {
        $user = $request->user();
        $user->tokens()->delete(); // Revoke all tokens for the user
        $user->delete();

        return response()->json(['message' => 'Account deleted successfully.']);
    }

    /**
     * @OA\Post(
     *     path="/api/users/me/avatar",
     *     summary="Upload or update authenticated user's avatar",
     *     tags={"User Profile"},
     *     security={{"sanctum": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\MediaType(
     *             mediaType="multipart/form-data",
     *             @OA\Schema(
     *                 @OA\Property(
     *                     property="avatar",
     *                     type="string",
     *                     format="binary",
     *                     description="The avatar image file (max 2MB, jpeg, png, jpg, gif, svg)"
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Avatar uploaded successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Avatar uploaded successfully."),
     *             @OA\Property(property="avatar_url", type="string", example="http://localhost:8000/storage/users/avatars/user_1_1678886400.png")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Validation Error"),
     *             @OA\Property(property="errors", type="object", example={"avatar": {"The avatar must be an image."}})
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function uploadAvatar(Request $request, FileUploadService $fileUploadService)
    {
        try {
            $validatedData = $request->validate([
                'avatar' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => $e->errors(),
            ], 422);
        }

        $user = $request->user();
        $avatarPath = $fileUploadService->uploadUserAvatar($request->file('avatar'), $user);

        $user->avatar_url = Storage::url($avatarPath);
        $user->save();

        return response()->json([
            'message' => 'Avatar uploaded successfully.',
            'avatar_url' => $user->avatar_url,
        ]);
    }

    /**
     * @OA\Delete(
     *     path="/api/users/me/avatar",
     *     summary="Delete authenticated user's avatar",
     *     tags={"User Profile"},
     *     security={{"sanctum": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Avatar deleted successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Avatar deleted successfully.")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="No avatar to delete"
     *     )
     * )
     */
    public function deleteAvatar(Request $request)
    {
        $user = $request->user();

        if (!$user->avatar_url) {
            return response()->json(['message' => 'No avatar to delete.'], 404);
        }

        // Extract the path relative to the storage disk
        $pathToDelete = str_replace(Storage::url(''), '', $user->avatar_url);

        if (Storage::disk('public')->exists($pathToDelete)) {
            Storage::disk('public')->delete($pathToDelete);
        }

        $user->avatar_url = null;
        $user->save();

        return response()->json(['message' => 'Avatar deleted successfully.']);
    }
}
