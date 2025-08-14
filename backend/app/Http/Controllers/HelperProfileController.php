<?php

namespace App\Http\Controllers;

use App\Models\HelperProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use OpenApi\Annotations as OA;

class HelperProfileController extends Controller
{
    /**
     * @OA\Get(
     *     path="/helper-profiles",
     *     summary="List helper profiles",
     *     tags={"Helper Profiles"},
     *     @OA\Response(
     *         response=200,
     *         description="A list of helper profiles",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(ref="#/components/schemas/HelperProfile")
     *         )
     *     )
     * )
     */
    public function index()
    {
        $helperProfiles = HelperProfile::with('photos')->where('is_public', true)->get();

        return response()->json(['data' => $helperProfiles]);
    }

    /**
     * @OA\Post(
     *     path="/helper-profiles",
     *     summary="Create a helper profile",
     *     tags={"Helper Profiles"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Helper profile created successfully",
     *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'country' => 'required|string|max:255',
            'address' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'state' => 'required|string|max:255',
            'phone_number' => 'required|string|max:20',
            'experience' => 'required|string',
            'has_pets' => 'required|boolean',
            'has_children' => 'required|boolean',
            'can_foster' => 'required|boolean',
            'can_adopt' => 'required|boolean',
            'is_public' => 'required|boolean',
            'zip_code' => 'required|string|max:20',
            'photos' => 'sometimes|array|max:5',
            'photos.*' => 'image|mimes:jpeg,png,jpg,gif,svg|max:10240',
        ]);

        $helperProfile = Auth::user()->helperProfiles()->create($validatedData);

        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $photo) {
                $path = $photo->store('helper-profile-photos', 'public');
                $helperProfile->photos()->create(['path' => $path]);
            }
        }

        return response()->json(['data' => $helperProfile->load('photos')], 201);
    }

    /**
     * @OA\Get(
     *     path="/helper-profiles/{id}",
     *     summary="Get a specific helper profile",
     *     tags={"Helper Profiles"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the helper profile",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="The helper profile",
     *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Helper profile not found"
     *     )
     * )
     */
    public function show(Request $request, HelperProfile $helperProfile)
    {
        $user = $request->user();
        // Allow viewing if the profile is public or owned by the requester
        if ($helperProfile->is_public || ($user && $helperProfile->user_id === $user->id)) {
            return response()->json(['data' => $helperProfile->load('photos', 'user')]);
        }
        return response()->json(['message' => 'Forbidden'], 403);
    }

    /**
     * @OA\Put(
     *     path="/helper-profiles/{id}",
     *     summary="Update a helper profile",
     *     tags={"Helper Profiles"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the helper profile",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Helper profile updated successfully",
     *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
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
    public function update(Request $request, HelperProfile $helperProfile)
    {
        Log::info('Update request received', ['request_data' => $request->all(), 'files' => $request->files->all()]);

        $this->authorize('update', $helperProfile);

        $validatedData = $request->validate([
            'country' => 'sometimes|string|max:255',
            'address' => 'sometimes|string|max:255',
            'city' => 'sometimes|string|max:255',
            'state' => 'sometimes|string|max:255',
            'phone_number' => 'sometimes|string|max:20',
            'experience' => 'sometimes|string',
            'has_pets' => 'sometimes|boolean',
            'has_children' => 'sometimes|boolean',
            'can_foster' => 'sometimes|boolean',
            'can_adopt' => 'sometimes|boolean',
            'is_public' => 'sometimes|boolean',
            'status' => 'sometimes|string|in:active,cancelled,deleted',
            'photos' => 'sometimes|array|max:5',
            'photos.*' => 'image|mimes:jpeg,png,jpg,gif,svg|max:10240',
        ]);

        $helperProfile->update($validatedData);

        if ($request->hasFile('photos')) {
            Log::info('Photos found in request');
            // TODO: Delete old photos
            foreach ($request->file('photos') as $photo) {
                $path = $photo->store('helper-profile-photos', 'public');
                $helperProfile->photos()->create(['path' => $path]);
            }
        } else {
            Log::info('No photos found in request');
        }

        return response()->json(['data' => $helperProfile->load('photos')]);
    }

    /**
     * @OA\Delete(
     *     path="/helper-profiles/{id}",
     *     summary="Delete a helper profile",
     *     tags={"Helper Profiles"},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the helper profile",
     *         @OA\Schema(type="integer")
     *     ),
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
    public function destroy(HelperProfile $helperProfile)
    {
        $this->authorize('delete', $helperProfile);

        $helperProfile->delete();

        return response()->json(null, 204);
    }

    public function destroyPhoto(HelperProfile $helperProfile, $photoId)
    {
        $this->authorize('update', $helperProfile);

        $photo = $helperProfile->photos()->findOrFail($photoId);

        // Delete the photo file from storage
        Storage::disk('public')->delete($photo->path);

        // Delete the photo record from the database
        $photo->delete();

        return response()->json(null, 204);
    }
}