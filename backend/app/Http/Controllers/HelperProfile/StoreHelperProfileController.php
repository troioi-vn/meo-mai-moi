<?php

namespace App\Http\Controllers\HelperProfile;

use App\Enums\PlacementRequestType;
use App\Http\Controllers\Controller;
use App\Models\City;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

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
            'city_id' => 'required|integer|exists:cities,id',
            'address' => 'nullable|string|max:255',
            'zip_code' => 'nullable|string|max:20',
            'phone_number' => 'required|string|max:20',
            'contact_info' => 'nullable|string|max:1000',
            'experience' => 'required|string',
            'has_pets' => 'required|boolean',
            'has_children' => 'required|boolean',
            'request_types' => ['required', 'array', 'min:1'],
            'request_types.*' => [Rule::enum(PlacementRequestType::class)],
            'photos' => 'sometimes|array|max:5',
            'photos.*' => 'image|mimes:jpeg,png,jpg,gif,svg|max:10240',
            'pet_type_ids' => 'sometimes|array',
            'pet_type_ids.*' => 'exists:pet_types,id',
        ]);

        $validatedData['country'] = strtoupper($validatedData['country']);

        $city = City::find($validatedData['city_id']);
        if (! $city) {
            return response()->json(['message' => 'City not found'], 422);
        }
        if ($city->country !== $validatedData['country']) {
            return response()->json(['message' => 'Selected city does not belong to the specified country.'], 422);
        }

        /** @var \App\Models\HelperProfile $helperProfile */
        $helperProfile = Auth::user()->helperProfiles()->create($validatedData);
        $helperProfile->update([
            'city' => $city->name,
        ]);

        if (isset($validatedData['pet_type_ids'])) {
            $helperProfile->petTypes()->sync($validatedData['pet_type_ids']);
        }

        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $photo) {
                $path = $photo->store('helper-profile-photos', 'public');
                $helperProfile->photos()->create(['path' => $path]);
            }
        }

        return response()->json(['data' => $helperProfile->load('photos', 'city')], 201);
    }
}
