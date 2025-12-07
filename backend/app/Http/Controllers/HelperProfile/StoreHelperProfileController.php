<?php

namespace App\Http\Controllers\HelperProfile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * @OA\Post(
 *     path="/helper-profiles",
 *     summary="Create a helper profile",
 *     tags={"Helper Profiles"},
 *
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
 *     ),
 *
 *     @OA\Response(
 *         response=201,
 *         description="Helper profile created successfully",
 *
 *         @OA\JsonContent(ref="#/components/schemas/HelperProfile")
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error"
 *     )
 * )
 */
class StoreHelperProfileController extends Controller
{
    public function __invoke(Request $request)
    {
        $validatedData = $request->validate([
            'country' => 'required|string|size:2',
            'state' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'zip_code' => 'nullable|string|max:20',
            'phone_number' => 'required|string|max:20',
            'experience' => 'required|string',
            'has_pets' => 'required|boolean',
            'has_children' => 'required|boolean',
            'can_foster' => 'required|boolean',
            'can_adopt' => 'required|boolean',
            'is_public' => 'required|boolean',
            'photos' => 'sometimes|array|max:5',
            'photos.*' => 'image|mimes:jpeg,png,jpg,gif,svg|max:10240',
            'pet_type_ids' => 'sometimes|array',
            'pet_type_ids.*' => 'exists:pet_types,id',
        ]);

        /** @var \App\Models\HelperProfile $helperProfile */
        $helperProfile = Auth::user()->helperProfiles()->create($validatedData);

        if (isset($validatedData['pet_type_ids'])) {
            $helperProfile->petTypes()->sync($validatedData['pet_type_ids']);
        }

        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $photo) {
                $path = $photo->store('helper-profile-photos', 'public');
                $helperProfile->photos()->create(['path' => $path]);
            }
        }

        return response()->json(['data' => $helperProfile->load('photos')], 201);
    }
}
