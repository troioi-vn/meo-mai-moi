<?php

namespace App\Http\Controllers\Pet;

use App\Enums\PetRelationshipType;
use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\Pet;
use App\Services\PetRelationshipService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * @OA\Put(
 *     path="/api/pets/{id}",
 *     summary="Update a pet",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(
 *         name="id",
 *         in="path",
 *         required=true,
 *         description="ID of the pet to update",
 *
 *         @OA\Schema(type="integer")
 *     ),
 *
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(ref="#/components/schemas/Pet")
 *     ),
 *
 *     @OA\Response(
 *         response=200,
 *         description="Pet updated successfully",
 *
 *         @OA\JsonContent(ref="#/components/schemas/Pet")
 *     ),
 *
 *     @OA\Response(
 *         response=403,
 *         description="Forbidden"
 *     ),
 *     @OA\Response(
 *         response=422,
 *         description="Validation error"
 *     )
 * )
 */
class UpdatePetController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __construct(
        protected PetRelationshipService $relationshipService
    ) {}

    public function __invoke(Request $request, Pet $pet)
    {
        $user = $this->authorizeUser($request, 'update', $pet);

        $rules = [
            'name' => 'sometimes|required|string|max:255',
            'sex' => 'nullable|in:male,female,not_specified',
            'country' => 'sometimes|required|string|size:2',
            'state' => 'nullable|string|max:255',
            'city_id' => 'sometimes|required|integer|exists:cities,id',
            'address' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'pet_type_id' => 'sometimes|required|exists:pet_types,id',
            // Category IDs
            'category_ids' => 'nullable|array|max:10',
            'category_ids.*' => 'integer|exists:categories,id',
            // Viewer / editor permissions
            'viewer_user_ids' => 'nullable|array',
            'viewer_user_ids.*' => 'integer|distinct|exists:users,id',
            'editor_user_ids' => 'nullable|array',
            'editor_user_ids.*' => 'integer|distinct|exists:users,id',
            'birthday' => 'nullable|date|before_or_equal:today',
            'birthday_precision' => 'nullable|in:day,month,year,unknown',
            'birthday_year' => 'nullable|integer|min:1900|max:'.now()->year,
            'birthday_month' => 'nullable|integer|min:1|max:12',
            'birthday_day' => 'nullable|integer|min:1|max:31',
        ];

        $validator = Validator::make($request->all(), $rules);
        $validator->after(function ($v) use ($request) {
            $precision = $request->input('birthday_precision');
            $legacyBirthday = $request->input('birthday');
            if ($legacyBirthday && ! $precision) {
                $precision = 'day';
                $request->merge(['birthday_precision' => 'day']);
            }
            $year = $request->input('birthday_year');
            $month = $request->input('birthday_month');
            $day = $request->input('birthday_day');

            if (! $precision) {
                if ($legacyBirthday || $year || $month || $day) {
                    $v->errors()->add('birthday_precision', 'birthday_precision is required when providing birthday components.');
                }

                return;
            }
            switch ($precision) {
                case 'unknown':
                    if ($legacyBirthday || $year || $month || $day) {
                        $v->errors()->add('birthday_precision', 'No date components allowed when precision is unknown.');
                    }
                    break;
                case 'year':
                    if (! $year) {
                        $v->errors()->add('birthday_year', 'birthday_year is required for year precision.');
                    }
                    if ($month || $day) {
                        $v->errors()->add('birthday_month', 'Remove month/day for year precision.');
                    }
                    if ($year && $year > (int) now()->year) {
                        $v->errors()->add('birthday_year', 'Year cannot be in the future.');
                    }
                    break;
                case 'month':
                    if (! $year || ! $month) {
                        $v->errors()->add('birthday_month', 'birthday_year and birthday_month are required for month precision.');
                    }
                    if ($day) {
                        $v->errors()->add('birthday_day', 'Remove day for month precision.');
                    }
                    if ($year && $month) {
                        $date = Carbon::create($year, $month, 1, 0, 0, 0);
                        if ($date->isFuture()) {
                            $v->errors()->add('birthday_month', 'Month cannot be in the future.');
                        }
                    }
                    break;
                case 'day':
                    if ($legacyBirthday) {
                        try {
                            $parsed = Carbon::parse($legacyBirthday);
                            if ($parsed->isFuture()) {
                                $v->errors()->add('birthday', 'Birthday cannot be in the future.');
                            }
                        } catch (Exception $e) {
                            $v->errors()->add('birthday', 'Invalid birthday date.');
                        }
                    } else {
                        if (! ($year && $month && $day)) {
                            $v->errors()->add('birthday_day', 'birthday_year, birthday_month and birthday_day are required for day precision.');
                        } else {
                            try {
                                $date = Carbon::create($year, $month, $day, 0, 0, 0);
                                if ($date->isFuture()) {
                                    $v->errors()->add('birthday_day', 'Birthday cannot be in the future.');
                                }
                            } catch (Exception $e) {
                                $v->errors()->add('birthday_day', 'Invalid date combination.');
                            }
                        }
                    }
                    break;
            }
        });
        $validator->validate();
        $data = $validator->validated();
        if (isset($data['country'])) {
            $data['country'] = strtoupper($data['country']);
        }
        $precision = $data['birthday_precision'] ?? $pet->birthday_precision ?? 'unknown';
        $birthdayDate = $pet->birthday; // default retain
        if ($precision === 'day') {
            if (! empty($data['birthday'])) {
                $birthdayDate = $data['birthday'];
                $dt = Carbon::parse($birthdayDate);
                $data['birthday_year'] = (int) $dt->year;
                $data['birthday_month'] = (int) $dt->month;
                $data['birthday_day'] = (int) $dt->day;
            } elseif (! empty($data['birthday_year']) && ! empty($data['birthday_month']) && ! empty($data['birthday_day'])) {
                $birthdayDate = sprintf('%04d-%02d-%02d', $data['birthday_year'], $data['birthday_month'], $data['birthday_day']);
            }
        } else {
            $birthdayDate = null;
            $data['birthday'] = null;
            if ($precision === 'unknown') {
                $data['birthday_year'] = $data['birthday_month'] = $data['birthday_day'] = null;
            } elseif ($precision === 'year') {
                $data['birthday_month'] = $data['birthday_day'] = null;
            } elseif ($precision === 'month') {
                $data['birthday_day'] = null;
            }
        }

        if (isset($data['city_id'])) {
            $countryForCity = $data['country'] ?? $pet->country;
            $city = City::find($data['city_id']);
            if (! ($city instanceof City)) {
                return $this->sendError('City not found.', 422);
            }
            if ($city->country !== $countryForCity) {
                return $this->sendError('Selected city does not belong to the specified country.', 422);
            }
            $data['city'] = $city->name;
        }

        $pet->fill(array_filter([
            'name' => $data['name'] ?? null,
            'sex' => $data['sex'] ?? null,
            'birthday' => $birthdayDate,
            'birthday_year' => $data['birthday_year'] ?? null,
            'birthday_month' => $data['birthday_month'] ?? null,
            'birthday_day' => $data['birthday_day'] ?? null,
            'birthday_precision' => $precision,
            'country' => $data['country'] ?? null,
            'state' => $data['state'] ?? null,
            'city_id' => $data['city_id'] ?? null,
            'city' => $data['city'] ?? null,
            'address' => $data['address'] ?? null,
            'description' => $data['description'] ?? null,
            'pet_type_id' => $data['pet_type_id'] ?? null,
        ], fn ($v) => $v !== null));
        $pet->save();

        // Sync categories if provided
        if (isset($data['category_ids'])) {
            $pet->categories()->sync($data['category_ids']);
        }

        // Sync viewers / editors if provided
        if (isset($data['viewer_user_ids'])) {
            $this->relationshipService->syncRelationships($pet, $data['viewer_user_ids'], PetRelationshipType::VIEWER, $request->user());
        }
        if (isset($data['editor_user_ids'])) {
            $this->relationshipService->syncRelationships($pet, $data['editor_user_ids'], PetRelationshipType::EDITOR, $request->user());
        }

        $pet->load(['petType', 'categories', 'viewers', 'editors', 'city']);

        // Build viewer permission flags for response
        $viewerPermissions = [
            'can_edit' => $pet->canBeEditedBy($user) || $this->hasRole($user, ['admin', 'super_admin']),
            'can_view_contact' => $this->hasRole($user, ['admin', 'super_admin']) || ($user && ! $pet->isOwnedBy($user)),
        ];
        $pet->setAttribute('viewer_permissions', $viewerPermissions);

        return $this->sendSuccess($pet);
    }
}
