<?php

namespace App\Http\Controllers\Pet;

use App\Enums\PetRelationshipType;
use App\Enums\PetStatus;
use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\Pet;
use App\Models\PetType;
use App\Services\PetRelationshipService;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/pets',
    summary: 'Create a new pet',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(ref: '#/components/schemas/Pet')
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'Pet created successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/Pet')
        ),
        new OA\Response(
            response: 422,
            description: 'Validation error'
        ),
    ]
)]
class StorePetController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $rules = [
            'name' => 'required|string|max:255',
            'sex' => 'nullable|in:male,female,not_specified',
            'country' => 'required|string|size:2',
            'state' => 'nullable|string|max:255',
            'city_id' => 'required|integer|exists:cities,id',
            'address' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'pet_type_id' => 'nullable|exists:pet_types,id',
            // Category IDs
            'category_ids' => 'nullable|array|max:10',
            'category_ids.*' => 'integer|exists:categories,id',
            // Viewer / editor permissions
            'viewer_user_ids' => 'nullable|array',
            'viewer_user_ids.*' => 'integer|distinct|exists:users,id',
            'editor_user_ids' => 'nullable|array',
            'editor_user_ids.*' => 'integer|distinct|exists:users,id',
            // Legacy exact date (optional now)
            'birthday' => 'nullable|date|before_or_equal:today',
            // New precision inputs
            'birthday_precision' => 'nullable|in:day,month,year,unknown',
            'birthday_year' => 'nullable|integer|min:1900|max:'.now()->year,
            'birthday_month' => 'nullable|integer|min:1|max:12',
            'birthday_day' => 'nullable|integer|min:1|max:31',
        ];

        $validator = Validator::make($request->all(), $rules);
        $validator->after(function ($v) use ($request) {
            $precision = $request->input('birthday_precision');
            $legacyBirthday = $request->input('birthday');

            // Normalize: if legacy birthday provided and no precision -> treat as day
            if ($legacyBirthday && ! $precision) {
                $precision = 'day';
                $request->merge(['birthday_precision' => 'day']);
            }

            $year = $request->input('birthday_year');
            $month = $request->input('birthday_month');
            $day = $request->input('birthday_day');

            if (! $precision) {
                // If none of birthday / components provided, that's fine (unknown)
                if ($legacyBirthday || $year || $month || $day) {
                    // Components without precision not allowed
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
                    // Allow either legacy birthday OR components
                    if ($legacyBirthday) {
                        try {
                            $parsed = Carbon::parse($legacyBirthday);
                            if ($parsed->isFuture()) {
                                $v->errors()->add('birthday', 'Invalid birthday date.');
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
        $data['country'] = strtoupper($data['country']);

        /** @var \App\Models\City $city */
        $city = City::find($data['city_id']);
        if (! $city) {
            return $this->sendError('City not found.', 422);
        }
        if ($city->country !== $data['country']) {
            return $this->sendError('Selected city does not belong to the specified country.', 422);
        }

        $precision = $data['birthday_precision'] ?? 'unknown';
        $birthdayDate = null;
        if ($precision === 'day') {
            if (! empty($data['birthday'])) {
                $birthdayDate = $data['birthday'];
                $dt = Carbon::parse($birthdayDate);
                $data['birthday_year'] = (int) $dt->year;
                $data['birthday_month'] = (int) $dt->month;
                $data['birthday_day'] = (int) $dt->day;
            } else {
                $birthdayDate = sprintf('%04d-%02d-%02d', $data['birthday_year'], $data['birthday_month'], $data['birthday_day']);
            }
        } else {
            // Remove legacy birthday if provided for other precisions
            $data['birthday'] = null;
        }

        $petTypeId = $data['pet_type_id'] ?? PetType::where('slug', 'cat')->value('id');
        if (! $petTypeId) {
            $petTypeId = PetType::create([
                'name' => 'Cat',
                'slug' => 'cat',
                'status' => \App\Enums\PetTypeStatus::ACTIVE,
                'is_system' => true,
                'display_order' => 0,
            ])->id;
        }

        $pet = Pet::create([
            'name' => $data['name'],
            'sex' => $data['sex'] ?? 'not_specified',
            'birthday' => $birthdayDate,
            'birthday_year' => $data['birthday_year'] ?? null,
            'birthday_month' => $data['birthday_month'] ?? null,
            'birthday_day' => $data['birthday_day'] ?? null,
            'birthday_precision' => $precision,
            'country' => $data['country'],
            'state' => $data['state'] ?? null,
            'city_id' => $data['city_id'],
            'city' => $city->name,
            'address' => $data['address'] ?? null,
            'description' => $data['description'] ?? '',
            'pet_type_id' => $petTypeId,
            'created_by' => $request->user()->id,
            'status' => PetStatus::ACTIVE,
        ]);

        // Initial ownership relationship is automatically created by Pet model's booted() method

        // Sync categories if provided
        if (isset($data['category_ids'])) {
            $pet->categories()->sync($data['category_ids']);
        }

        // Sync viewers / editors if provided
        $relationshipService = app(PetRelationshipService::class);
        if (isset($data['viewer_user_ids'])) {
            $relationshipService->syncRelationships($pet, $data['viewer_user_ids'], PetRelationshipType::VIEWER, $request->user());
        }
        if (isset($data['editor_user_ids'])) {
            $relationshipService->syncRelationships($pet, $data['editor_user_ids'], PetRelationshipType::EDITOR, $request->user());
        }

        $pet->load(['petType', 'categories', 'viewers', 'editors', 'city']);

        return $this->sendSuccess($pet, 201);
    }
}
