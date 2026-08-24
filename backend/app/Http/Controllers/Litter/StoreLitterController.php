<?php

declare(strict_types=1);

namespace App\Http\Controllers\Litter;

use App\Exceptions\DuplicatePetException;
use App\Exceptions\GroupException;
use App\Exceptions\InvalidPetDataException;
use App\Http\Controllers\Controller;
use App\Models\Litter;
use App\Models\PetType;
use App\Models\User;
use App\Services\Litter\LitterCreationService;
use App\Traits\ApiResponseTrait;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/litters',
    summary: 'Create a litter',
    description: 'Creates a litter plus all its member pets in one transaction. Members receive auto-generated names when none is provided.',
    tags: ['Litters'],
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['pet_type_id', 'country', 'members'],
            properties: [
                new OA\Property(property: 'name', type: 'string', nullable: true, example: 'My Litter', description: 'Optional litter name; server generates a date-based name when omitted'),
                new OA\Property(property: 'pet_type_id', type: 'integer', example: 1, description: 'Shared pet type for all members; must support litters'),
                new OA\Property(property: 'country', type: 'string', example: 'VN', description: 'ISO 3166-1 alpha-2 country code'),
                new OA\Property(property: 'state', type: 'string', nullable: true, example: 'Hanoi'),
                new OA\Property(property: 'city_id', type: 'integer', nullable: true, example: 1),
                new OA\Property(property: 'group_id', type: 'integer', nullable: true, example: 1, description: 'Optional group to attach all member pets to; actor must be an active admin'),
                new OA\Property(property: 'address', type: 'string', nullable: true, example: '123 Main St'),
                new OA\Property(property: 'description', type: 'string', nullable: true, example: 'Found in a box'),
                new OA\Property(property: 'birthday', type: 'string', format: 'date', nullable: true, example: '2024-06-01'),
                new OA\Property(property: 'birthday_precision', type: 'string', enum: ['day', 'month', 'year', 'unknown'], nullable: true, example: 'day'),
                new OA\Property(property: 'birthday_year', type: 'integer', nullable: true, example: 2024),
                new OA\Property(property: 'birthday_month', type: 'integer', nullable: true, example: 6),
                new OA\Property(property: 'birthday_day', type: 'integer', nullable: true, example: 1),
                new OA\Property(
                    property: 'members',
                    type: 'array',
                    items: new OA\Items(
                        type: 'object',
                        properties: [
                            new OA\Property(property: 'name', type: 'string', nullable: true, example: 'Kitten 1'),
                            new OA\Property(property: 'sex', type: 'string', enum: ['male', 'female', 'not_specified'], nullable: true, example: 'female'),
                            new OA\Property(property: 'weight_kg', type: 'number', format: 'float', nullable: true, example: 0.3),
                        ]
                    ),
                    description: 'Between 2 and the configured maximum members'
                ),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'Litter created successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/LitterResponse')
        ),
        new OA\Response(response: 422, description: 'Validation error'),
        new OA\Response(response: 403, description: 'Forbidden'),
    ]
)]
class StoreLitterController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, LitterCreationService $litterCreationService): JsonResponse
    {
        $minMembers = (int) config('litters.min_members');
        $maxMembers = (int) config('litters.max_members');

        $rules = [
            'name' => 'nullable|string|max:255',
            'pet_type_id' => 'required|integer|exists:pet_types,id',
            'country' => 'required|string|size:2',
            'state' => 'nullable|string|max:255',
            'city_id' => 'nullable|integer|exists:cities,id',
            'address' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'birthday' => 'nullable|date|before_or_equal:today',
            'birthday_precision' => 'nullable|in:day,month,year,unknown',
            'birthday_year' => 'nullable|integer|min:1900|max:'.now()->year,
            'birthday_month' => 'nullable|integer|min:1|max:12',
            'birthday_day' => 'nullable|integer|min:1|max:31',
            'members' => ['required', 'array', 'min:'.$minMembers, 'max:'.$maxMembers],
            'members.*.name' => 'nullable|string|max:255',
            'members.*.sex' => 'nullable|in:male,female,not_specified',
            'members.*.weight_kg' => 'nullable|numeric|min:0|max:200',
            'group_id' => ['nullable', 'integer', Rule::exists('groups', 'id')->whereNull('deleted_at')],
        ];

        $validator = Validator::make($request->all(), $rules);

        $validator->after(function ($v) use ($request): void {
            $petTypeId = $request->input('pet_type_id');
            if ($petTypeId) {
                $petType = PetType::find($petTypeId);
                if ($petType && ! $petType->supports_litters) {
                    $v->errors()->add('pet_type_id', __('litters.errors.unsupported_type'));
                }
            }

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
                        if ($date && $date->isFuture()) {
                            $v->errors()->add('birthday_month', 'Month cannot be in the future.');
                        }
                    }
                    break;
                case 'day':
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
                                if ($date && $date->isFuture()) {
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

        /** @var User $user */
        $user = $request->user();

        if ($user->cannot('create', Litter::class)) {
            return $this->sendError(__('messages.forbidden'), 403);
        }

        try {
            $litter = $litterCreationService->create($user, $data);
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

        return $this->sendSuccess($litter, 201);
    }
}
