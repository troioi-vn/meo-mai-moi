<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Exceptions\DuplicatePetException;
use App\Exceptions\GroupException;
use App\Exceptions\InvalidPetDataException;
use App\Http\Controllers\Controller;
use App\Services\Pet\PetCreationService;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/pets',
    summary: 'Create a new pet',
    description: 'Creates a pet profile. The request must include country as an ISO 3166-1 alpha-2 code (for example, VN).',
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
            content: new OA\JsonContent(ref: '#/components/schemas/PetResponse')
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

    public function __invoke(Request $request, PetCreationService $petCreationService): JsonResponse
    {
        $rules = [
            'name' => 'required|string|max:255',
            'sex' => 'nullable|in:male,female,not_specified',
            'country' => 'required|string|size:2',
            'state' => 'nullable|string|max:255',
            'city_id' => 'nullable|integer|exists:cities,id',
            'address' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'pet_type_id' => 'nullable|exists:pet_types,id',
            'allow_duplicate' => 'sometimes|boolean',
            // Category IDs
            'category_ids' => 'nullable|array|max:10',
            'category_ids.*' => 'integer|distinct|exists:categories,id',
            // Viewer / editor permissions
            'viewer_user_ids' => 'nullable|array',
            'viewer_user_ids.*' => 'integer|distinct|exists:users,id',
            'editor_user_ids' => 'nullable|array',
            'editor_user_ids.*' => 'integer|distinct|exists:users,id',
            'group_id' => ['nullable', 'integer', Rule::exists('groups', 'id')->whereNull('deleted_at')],
            // Legacy exact date (optional now)
            'birthday' => 'nullable|date|before_or_equal:today',
            // New precision inputs
            'birthday_precision' => 'nullable|in:day,month,year,unknown',
            'birthday_year' => 'nullable|integer|min:1900|max:'.now()->year,
            'birthday_month' => 'nullable|integer|min:1|max:12',
            'birthday_day' => 'nullable|integer|min:1|max:31',
        ];

        $validator = Validator::make($request->all(), $rules);
        $validator->after(function ($v) use ($request): void {
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
        $allowDuplicate = (bool) ($data['allow_duplicate'] ?? false);
        unset($data['allow_duplicate']);

        try {
            $pet = DB::transaction(function () use ($request, $petCreationService, $data, $allowDuplicate) {
                return $petCreationService->create($request->user(), $data, $allowDuplicate);
            });
        } catch (DuplicatePetException $e) {
            return response()->json([
                'success' => false,
                'data' => ['existing_pet_ids' => $e->existingPetIds],
                'message' => 'A pet with the same name and species already exists.',
                'error' => 'duplicate_pet',
            ], 409);
        } catch (InvalidPetDataException $e) {
            $message = match ($e->getMessage()) {
                InvalidPetDataException::CITY_NOT_FOUND => __('messages.city.not_found'),
                InvalidPetDataException::CITY_COUNTRY_MISMATCH => __('messages.city.country_mismatch'),
                InvalidPetDataException::INVALID_CATEGORIES => 'Every category must be visible and match the pet type.',
                default => $e->getMessage(),
            };

            return $this->sendError($message, 422);
        } catch (GroupException $e) {
            $code = $e->getMessage();
            $status = match ($code) {
                'last_admin_required',
                'already_a_member',
                'pet_already_assigned' => 422,
                default => 403,
            };

            return $this->sendError(__('groups.'.$code), $status);
        }

        $pet->load(['petType', 'categories', 'viewers', 'editors', 'city']);

        return $this->sendSuccess($pet, 201);
    }
}
