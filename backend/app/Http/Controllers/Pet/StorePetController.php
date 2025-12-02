<?php

namespace App\Http\Controllers\Pet;

use App\Enums\PetStatus;
use App\Http\Controllers\Controller;
use App\Models\OwnershipHistory;
use App\Models\Pet;
use App\Models\PetType;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

/**
 * @OA\Post(
 *     path="/api/pets",
 *     summary="Create a new pet",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\RequestBody(
 *         required=true,
 *
 *         @OA\JsonContent(ref="#/components/schemas/Pet")
 *     ),
 *
 *     @OA\Response(
 *         response=201,
 *         description="Pet created successfully",
 *
 *         @OA\JsonContent(ref="#/components/schemas/Pet")
 *     ),
 *
 *     @OA\Response(
 *         response=422,
 *         description="Validation error"
 *     )
 * )
 */
class StorePetController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request)
    {
        $rules = [
            'name' => 'required|string|max:255',
            'breed' => 'required|string|max:255',
            'country' => 'required|string|size:2',
            'state' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'pet_type_id' => 'nullable|exists:pet_types,id',
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
            'breed' => $data['breed'],
            'birthday' => $birthdayDate,
            'birthday_year' => $data['birthday_year'] ?? null,
            'birthday_month' => $data['birthday_month'] ?? null,
            'birthday_day' => $data['birthday_day'] ?? null,
            'birthday_precision' => $precision,
            'country' => $data['country'],
            'state' => $data['state'] ?? null,
            'city' => $data['city'] ?? null,
            'address' => $data['address'] ?? null,
            'description' => $data['description'] ?? '',
            'pet_type_id' => $petTypeId,
            'user_id' => $request->user()->id,
            'status' => PetStatus::ACTIVE,
        ]);

        // Create initial ownership history (open period) for the creator as owner, when table exists
        if (Schema::hasTable('ownership_history')) {
            $hasOpen = OwnershipHistory::where('pet_id', $pet->id)
                ->where('user_id', $request->user()->id)
                ->whereNull('to_ts')
                ->exists();
            if (! $hasOpen) {
                OwnershipHistory::create([
                    'pet_id' => $pet->id,
                    'user_id' => $request->user()->id,
                    'from_ts' => now(),
                    'to_ts' => null,
                ]);
            }
        }

        $pet->load('petType');

        return $this->sendSuccess($pet, 201);
    }
}
