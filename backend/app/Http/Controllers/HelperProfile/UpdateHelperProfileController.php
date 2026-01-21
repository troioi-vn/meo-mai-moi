<?php

declare(strict_types=1);

namespace App\Http\Controllers\HelperProfile;

use App\Enums\PlacementRequestType;
use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\HelperProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/helper-profiles/{id}',
    summary: 'Update a helper profile',
    tags: ['Helper Profiles'],
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the helper profile',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(ref: '#/components/schemas/HelperProfile')
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Helper profile updated successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/HelperProfile')
        ),
        new OA\Response(
            response: 403,
            description: 'Unauthorized'
        ),
        new OA\Response(
            response: 422,
            description: 'Validation error'
        ),
    ]
)]
#[OA\Post(
    path: '/helper-profiles/{id}',
    summary: 'Update a helper profile (DEPRECATED - use PUT instead)',
    deprecated: true,
    tags: ['Helper Profiles'],
    description: 'This endpoint is deprecated. Use PUT /helper-profiles/{id} instead. Kept for HTML form compatibility.',
    parameters: [
        new OA\Parameter(
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID of the helper profile',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(ref: '#/components/schemas/HelperProfile')
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Helper profile updated successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/HelperProfile')
        ),
        new OA\Response(
            response: 403,
            description: 'Unauthorized'
        ),
        new OA\Response(
            response: 422,
            description: 'Validation error'
        ),
    ]
)]
class UpdateHelperProfileController extends Controller
{
    public function __invoke(Request $request, HelperProfile $helperProfile)
    {
        Log::info('Update request received', ['request_data' => $request->all(), 'files' => $request->files->all()]);

        $this->authorize('update', $helperProfile);

        $validatedData = $request->validate([
            'country' => 'sometimes|string|size:2',
            'state' => 'sometimes|string|max:255|nullable',
            'city_ids' => 'sometimes|required|array|min:1',
            'city_ids.*' => 'integer|exists:cities,id',
            'address' => 'sometimes|string|max:255|nullable',
            'zip_code' => 'sometimes|string|max:20|nullable',
            'phone_number' => 'sometimes|string|max:20',
            'contact_info' => 'sometimes|string|max:1000|nullable',
            'experience' => 'sometimes|string',
            'has_pets' => 'sometimes|boolean',
            'has_children' => 'sometimes|boolean',
            'request_types' => ['sometimes', 'array', 'min:1'],
            'request_types.*' => [Rule::enum(PlacementRequestType::class)],
            'status' => ['sometimes', Rule::enum(\App\Enums\HelperProfileStatus::class)],
            'photos' => 'sometimes|array|max:5',
            'photos.*' => 'image|mimes:jpeg,png,jpg,gif,svg|max:10240',
            'pet_type_ids' => 'sometimes|array',
            'pet_type_ids.*' => 'exists:pet_types,id',
        ]);

        if (isset($validatedData['country'])) {
            $validatedData['country'] = strtoupper($validatedData['country']);
        }

        $helperProfile->update($validatedData);
        if (isset($validatedData['city_ids'])) {
            $country = $validatedData['country'] ?? $helperProfile->country;
            $cities = City::whereIn('id', $validatedData['city_ids'])->get();
            if ($cities->count() !== count($validatedData['city_ids'])) {
                return response()->json(['message' => 'One or more cities not found'], 422);
            }

            foreach ($cities as $city) {
                if ($city->country !== strtoupper($country)) {
                    return response()->json(['message' => "City {$city->name} does not belong to the specified country."], 422);
                }
            }

            $helperProfile->cities()->sync($validatedData['city_ids']);
            $helperProfile->update([
                'city' => $cities->pluck('name')->implode(', '),
                'city_id' => $cities->first()->id,
                'country' => strtoupper($country),
            ]);
        } elseif (isset($validatedData['country'])) {
            $helperProfile->update([
                'country' => strtoupper($validatedData['country']),
            ]);
        }

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

        return response()->json(['data' => $helperProfile->load('photos', 'cities')]);
    }
}
