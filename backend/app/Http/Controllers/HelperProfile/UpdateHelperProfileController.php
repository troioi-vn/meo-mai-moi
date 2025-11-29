<?php

namespace App\Http\Controllers\HelperProfile;

use App\Http\Controllers\Controller;
use App\Models\HelperProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * @OA\Put(
 *     path="/helper-profiles/{id}",
 *     summary="Update a helper profile",
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
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Helper profile updated successfully",
 *
 *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Unauthorized"
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Validation error"
 *     )
 * )
 *
 * @OA\Post(
 *     path="/helper-profiles/{id}",
 *     summary="Update a helper profile (DEPRECATED - use PUT instead)",
 *     deprecated=true,
 *     tags={"Helper Profiles"},
 *     description="This endpoint is deprecated. Use PUT /helper-profiles/{id} instead. Kept for HTML form compatibility.",
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
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Helper profile updated successfully",
 *
 *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
 *     ),
 *
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
class UpdateHelperProfileController extends Controller
{
    public function __invoke(Request $request, HelperProfile $helperProfile)
    {
        Log::info('Update request received', ['request_data' => $request->all(), 'files' => $request->files->all()]);

        $this->authorize('update', $helperProfile);

        $validatedData = $request->validate([
            'country' => 'sometimes|string|max:255',
            'address' => 'sometimes|string|max:255',
            'city' => 'sometimes|string|max:255',
            'state' => 'sometimes|string|max:255',
            'zip_code' => 'sometimes|string|max:20',
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
            'pet_type_ids' => 'sometimes|array',
            'pet_type_ids.*' => 'exists:pet_types,id',
        ]);

        $helperProfile->update($validatedData);

        if (isset($validatedData['pet_type_ids'])) {
            $helperProfile->petTypes()->sync($validatedData['pet_type_ids']);
        }

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
}
