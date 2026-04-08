<?php

declare(strict_types=1);

namespace App\Http\Controllers\HelperProfile;

use App\Enums\HelperContactDetailType;
use App\Enums\HelperProfileApprovalStatus;
use App\Enums\HelperProfileStatus;
use App\Enums\PlacementRequestType;
use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\HelperProfile;
use App\Support\HelperContactDetails;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/helper-profiles',
    summary: 'Create a helper profile',
    tags: ['Helper Profiles'],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(ref: '#/components/schemas/HelperProfile')
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'Helper profile created successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/HelperProfileResponse')
        ),
        new OA\Response(
            response: 422,
            description: 'Validation error'
        ),
    ]
)]
class StoreHelperProfileController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'country' => 'required|string|size:2',
            'state' => 'nullable|string|max:255',
            'city_ids' => 'required|array|min:1',
            'city_ids.*' => 'integer|exists:cities,id',
            'address' => 'nullable|string|max:255',
            'zip_code' => 'nullable|string|max:20',
            'phone_number' => 'required|string|max:20|regex:/^[\d\s\-\+\(\)]+$/',
            'contact_details' => 'nullable|array|max:20',
            'contact_details.*.type' => ['required', Rule::enum(HelperContactDetailType::class)],
            'contact_details.*.value' => 'required|string|max:255',
            'experience' => 'required|string',
            'offer' => 'nullable|string',
            'has_pets' => 'required|boolean',
            'has_children' => 'required|boolean',
            'request_types' => ['required', 'array', 'min:1'],
            'request_types.*' => [Rule::enum(PlacementRequestType::class)],
            'status' => ['sometimes', Rule::in(HelperProfileStatus::activeValues())],
            'photos' => 'sometimes|array|max:5',
            'photos.*' => 'image|mimes:jpeg,png,jpg,gif,svg|max:10240',
            'pet_type_ids' => 'sometimes|array',
            'pet_type_ids.*' => 'exists:pet_types,id',
        ]);
        $validator->after(function ($validator) use ($request): void {
            foreach (HelperContactDetails::validateMany($request->input('contact_details')) as $path => $message) {
                $validator->errors()->add($path, $message);
            }
        });

        $validatedData = $validator->validate();

        $validatedData['country'] = strtoupper($validatedData['country']);
        $validatedData['status'] ??= HelperProfileStatus::PRIVATE->value;
        $validatedData['approval_status'] ??= HelperProfileApprovalStatus::APPROVED->value;
        if (array_key_exists('offer', $validatedData)) {
            $validatedData['offer'] = blank($validatedData['offer']) ? null : trim($validatedData['offer']);
        }
        if (array_key_exists('contact_details', $validatedData)) {
            $validatedData['contact_details'] = HelperContactDetails::normalizeMany($validatedData['contact_details']);
        }

        $cities = City::whereIn('id', $validatedData['city_ids'])->get();
        if ($cities->count() !== count($validatedData['city_ids'])) {
            return $this->sendError(__('messages.helper.cities_not_found'), 422);
        }

        foreach ($cities as $city) {
            if ($city->country !== $validatedData['country']) {
                return $this->sendError(__('messages.helper.city_country_mismatch', ['name' => $city->name]), 422);
            }
        }

        /** @var HelperProfile $helperProfile */
        $helperProfile = Auth::user()->helperProfiles()->create($validatedData);
        $helperProfile->cities()->sync($validatedData['city_ids']);

        $helperProfile->update([
            'city' => $cities->pluck('name')->implode(', '),
            'city_id' => $cities->first()->id,
        ]);

        if (isset($validatedData['pet_type_ids'])) {
            $helperProfile->petTypes()->sync($validatedData['pet_type_ids']);
        }

        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $photo) {
                $helperProfile->addMedia($photo)->toMediaCollection('photos');
            }
        }

        return $this->sendSuccess($helperProfile->load('media', 'cities'), 201);
    }
}
