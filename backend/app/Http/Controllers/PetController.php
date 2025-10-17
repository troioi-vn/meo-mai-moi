<?php

namespace App\Http\Controllers;

use App\Enums\PetStatus;
use App\Models\OwnershipHistory;
use App\Models\Pet;
use App\Models\PetType;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesErrors;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="Pet",
 *     type="object",
 *     title="Pet",
 *     required={"id", "name", "breed", "location", "description", "status", "user_id", "pet_type_id"},
 *
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Whiskers"),
 *     @OA\Property(property="breed", type="string", example="Siamese"),
 *     @OA\Property(property="birthday", type="string", format="date", example="2020-01-01", nullable=true, description="Exact birthday (present only when birthday_precision=day). Deprecated: prefer component fields.", deprecated=true),
 *     @OA\Property(property="birthday_year", type="integer", example=2020, nullable=true, description="Birth year when known (year/month/day precision)."),
 *     @OA\Property(property="birthday_month", type="integer", example=5, nullable=true, description="Birth month when known (month/day precision)."),
 *     @OA\Property(property="birthday_day", type="integer", example=12, nullable=true, description="Birth day when known (day precision)."),
 *     @OA\Property(property="birthday_precision", type="string", enum={"day","month","year","unknown"}, example="month", description="Precision level for birthday components."),
 *     @OA\Property(property="location", type="string", example="Hanoi"),
 *     @OA\Property(property="description", type="string", example="A friendly pet."),
 *     @OA\Property(property="status", type="string", example="active"),
 *     @OA\Property(property="user_id", type="integer", example=5),
 *     @OA\Property(property="pet_type_id", type="integer", example=1)
 * )
 */
class PetController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesErrors;

    protected PetCapabilityService $capabilityService;

    public function __construct(PetCapabilityService $capabilityService)
    {
        $this->capabilityService = $capabilityService;
    }

    /**
     * @OA\Get(
     *     path="/api/my-pets",
     *     summary="Get the pets of the authenticated user",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *
     *     @OA\Response(
     *         response=200,
     *         description="A list of the user's pets",
     *
     *         @OA\JsonContent(
     *             type="array",
     *
     *             @OA\Items(ref="#/components/schemas/Pet")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function myPets(Request $request)
    {
        if (! $request->user()) {
            return $this->handleUnauthorized();
        }
        $query = Pet::where('user_id', $request->user()->id)->with('petType');

        if ($request->filled('pet_type')) {
            $slug = $request->query('pet_type');
            $query->whereHas('petType', function ($q) use ($slug) {
                $q->where('slug', $slug);
            });
        }

        $pets = $query->get();

        return $this->sendSuccess($pets);
    }

    /**
     * @OA\Get(
     *     path="/api/my-pets/sections",
     *     summary="Get the pets of the authenticated user, organized by section",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *
     *     @OA\Response(
     *         response=200,
     *         description="A list of the user's pets, organized by section",
     *
     *         @OA\JsonContent(
     *             type="object",
     *
     *             @OA\Property(property="owned", type="array", @OA\Items(ref="#/components/schemas/Pet")),
     *             @OA\Property(property="fostering_active", type="array", @OA\Items(ref="#/components/schemas/Pet")),
     *             @OA\Property(property="fostering_past", type="array", @OA\Items(ref="#/components/schemas/Pet")),
     *             @OA\Property(property="transferred_away", type="array", @OA\Items(ref="#/components/schemas/Pet"))
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function myPetsSections(Request $request)
    {
        $user = $this->requireAuth($request);

        // Owned (current owner)
        $owned = Pet::where('user_id', $user->id)->with('petType')->get();

        // Fostering active/past via assignments (guard if table not yet migrated in local/test envs)
        if (Schema::hasTable('foster_assignments')) {
            $activeFostering = \App\Models\FosterAssignment::where('foster_user_id', $user->id)
                ->where('status', 'active')
                ->with(['pet.petType'])
                ->get()
                ->pluck('pet');

            $pastFostering = \App\Models\FosterAssignment::where('foster_user_id', $user->id)
                ->whereIn('status', ['completed', 'canceled'])
                ->with(['pet.petType'])
                ->get()
                ->pluck('pet');
        } else {
            $activeFostering = collect();
            $pastFostering = collect();
        }

        // Transferred away: pets that the user used to own but no longer does
        // Uses ownership_history if available
        if (Schema::hasTable('ownership_history')) {
            $transferredPetIds = OwnershipHistory::where('user_id', $user->id)
                ->whereNotNull('to_ts')
                ->pluck('pet_id')
                ->unique();

            $transferredAway = Pet::whereIn('id', $transferredPetIds)
                ->where('user_id', '!=', $user->id)
                ->with('petType')
                ->get();
        } else {
            $transferredAway = collect();
        }

        return $this->sendSuccess([
            'owned' => $owned->values(),
            'fostering_active' => $activeFostering->values(),
            'fostering_past' => $pastFostering->values(),
            'transferred_away' => $transferredAway->values(),
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/pets/{id}",
     *     summary="Get a specific pet",
     *     tags={"Pets"},
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the pet",
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="The pet",
     *
     *         @OA\JsonContent(ref="#/components/schemas/Pet")
     *     ),
     *
     *     @OA\Response(
     *         response=404,
     *         description="Pet not found"
     *     )
     * )
     */
    public function show(Request $request, Pet $pet)
    {
        // Load placement requests and nested relations needed for the view
        $pet->load(['placementRequests.transferRequests.helperProfile.user', 'petType']);

        // Resolve user and authorize access
        $user = $this->authorizeUser($request, 'view', $pet);
        $isOwner = $this->isOwnerOrAdmin($user, $pet);
        $isAdmin = $this->hasRole($user, ['admin', 'super_admin']);

        $viewerPermissions = [
            'can_edit' => $isOwner || $isAdmin,
            'can_view_contact' => $isAdmin || ($user && ! $isOwner),
        ];
        $pet->setAttribute('viewer_permissions', $viewerPermissions);

        return $this->sendSuccess($pet);
    }

    /**
     * @OA\Get(
     *     path="/api/pets/featured",
     *     summary="Get a list of featured pets",
     *     tags={"Pets"},
     *
     *     @OA\Response(
     *         response=200,
     *         description="A list of featured pets",
     *
     *         @OA\JsonContent(
     *             type="array",
     *
     *             @OA\Items(ref="#/components/schemas/Pet")
     *         )
     *     )
     * )
     */
    public function featured()
    {
        // For now, return a random selection of 3 pets as featured (excluding dead pets)
        $featuredPets = Pet::whereNotIn('status', [PetStatus::DECEASED, PetStatus::DELETED])
            ->with('petType')
            ->inRandomOrder()
            ->limit(3)
            ->get();

        return $this->sendSuccess($featuredPets);
    }

    /**
     * @OA\Get(
     *     path="/api/pets/placement-requests",
     *     summary="Get a list of pets with open placement requests",
     *     tags={"Pets"},
     *
     *     @OA\Response(
     *         response=200,
     *         description="A list of pets with open placement requests",
     *
     *         @OA\JsonContent(
     *             type="array",
     *
     *             @OA\Items(ref="#/components/schemas/Pet")
     *         )
     *     )
     * )
     */
    public function placementRequests(Request $request)
    {
        $pets = Pet::whereHas('placementRequests', function ($query) {
            $query->where('status', \App\Enums\PlacementRequestStatus::OPEN);
        })->with(['placementRequests', 'petType'])->get();

        return $this->sendSuccess($pets);
    }

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
    public function store(Request $request)
    {
        $rules = [
            'name' => 'required|string|max:255',
            'breed' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'description' => 'required|string',
            'pet_type_id' => 'nullable|exists:pet_types,id',
            // Legacy exact date (optional now)
            'birthday' => 'nullable|date|before_or_equal:today',
            // New precision inputs
            'birthday_precision' => 'nullable|in:day,month,year,unknown',
            'birthday_year' => 'nullable|integer|min:1900|max:'.now()->year,
            'birthday_month' => 'nullable|integer|min:1|max:12',
            'birthday_day' => 'nullable|integer|min:1|max:31',
        ];

        $validator = \Validator::make($request->all(), $rules);
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
                        $date = \Carbon\Carbon::create($year, $month, 1, 0, 0, 0);
                        if ($date->isFuture()) {
                            $v->errors()->add('birthday_month', 'Month cannot be in the future.');
                        }
                    }
                    break;
                case 'day':
                    // Allow either legacy birthday OR components
                    if ($legacyBirthday) {
                        try {
                            $parsed = \Carbon\Carbon::parse($legacyBirthday);
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
                                $date = \Carbon\Carbon::create($year, $month, $day, 0, 0, 0);
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
                $dt = \Carbon\Carbon::parse($birthdayDate);
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
            'location' => $data['location'],
            'description' => $data['description'],
            'pet_type_id' => $petTypeId,
            'user_id' => $request->user()->id,
            'status' => PetStatus::ACTIVE,
        ]);

        // (Removed legacy second create block that referenced $validatedData)

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
    public function update(Request $request, Pet $pet)
    {
        $this->authorizeUser($request, 'update', $pet);

        $rules = [
            'name' => 'sometimes|required|string|max:255',
            'breed' => 'sometimes|required|string|max:255',
            'location' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'pet_type_id' => 'sometimes|required|exists:pet_types,id',
            'birthday' => 'nullable|date|before_or_equal:today',
            'birthday_precision' => 'nullable|in:day,month,year,unknown',
            'birthday_year' => 'nullable|integer|min:1900|max:'.now()->year,
            'birthday_month' => 'nullable|integer|min:1|max:12',
            'birthday_day' => 'nullable|integer|min:1|max:31',
        ];

        $validator = \Validator::make($request->all(), $rules);
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
                        $date = \Carbon\Carbon::create($year, $month, 1, 0, 0, 0);
                        if ($date->isFuture()) {
                            $v->errors()->add('birthday_month', 'Month cannot be in the future.');
                        }
                    }
                    break;
                case 'day':
                    if ($legacyBirthday) {
                        try {
                            $parsed = \Carbon\Carbon::parse($legacyBirthday);
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
                                $date = \Carbon\Carbon::create($year, $month, $day, 0, 0, 0);
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
        $precision = $data['birthday_precision'] ?? $pet->birthday_precision ?? 'unknown';
        $birthdayDate = $pet->birthday; // default retain
        if ($precision === 'day') {
            if (! empty($data['birthday'])) {
                $birthdayDate = $data['birthday'];
                $dt = \Carbon\Carbon::parse($birthdayDate);
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

        $pet->fill(array_filter([
            'name' => $data['name'] ?? null,
            'breed' => $data['breed'] ?? null,
            'birthday' => $birthdayDate,
            'birthday_year' => $data['birthday_year'] ?? null,
            'birthday_month' => $data['birthday_month'] ?? null,
            'birthday_day' => $data['birthday_day'] ?? null,
            'birthday_precision' => $precision,
            'location' => $data['location'] ?? null,
            'description' => $data['description'] ?? null,
            'pet_type_id' => $data['pet_type_id'] ?? null,
        ], fn ($v) => $v !== null));
        $pet->save();

        $pet->load('petType');

        return $this->sendSuccess($pet);
    }

    /**
     * @OA\Delete(
     *     path="/api/pets/{id}",
     *     summary="Delete a pet",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the pet to delete",
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"password"},
     *
     *             @OA\Property(property="password", type="string", format="password", description="User's current password for confirmation")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=204,
     *         description="Pet deleted successfully"
     *     ),
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
    public function destroy(Request $request, Pet $pet)
    {
        $user = $this->authorizeUser($request, 'delete', $pet);

        if (! Hash::check($request->input('password'), $user->password)) {
            return $this->handleBusinessError('The provided password does not match our records.', 422);
        }
        // Soft delete via status mutation (handled by overridden delete())
        $pet->delete();

        return response()->noContent();
    }

    /**
     * @OA\Put(
     *     path="/api/pets/{id}/status",
     *     summary="Update a pet's status",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, description="ID of the pet to update", @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"status", "password"},
     *
     *             @OA\Property(property="status", type="string", enum=App\Enums\PetStatus::class, example="lost"),
     *             @OA\Property(property="password", type="string", format="password", description="User's current password for confirmation")
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=200,
     *         description="Pet status updated successfully",
     *
     *         @OA\JsonContent(ref="#/components/schemas/Pet")
     *     ),
     *
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=422, description="Validation Error")
     * )
     */
    public function updateStatus(Request $request, Pet $pet)
    {
        $user = $this->authorizeUser($request, 'update', $pet);

        $validated = $request->validate([
            'status' => ['required', 'string', new \Illuminate\Validation\Rules\Enum(PetStatus::class)],
            'password' => 'required|string',
        ]);

        if (! Hash::check($validated['password'], $user->password)) {
            return $this->handleBusinessError('The provided password does not match our records.', 422);
        }

        $pet->status = $validated['status'];
        $pet->save();

        $pet->load('petType');

        return $this->sendSuccess($pet);
    }

    /**
     * @OA\Get(
     *     path="/api/pet-types",
     *     summary="Get all available pet types",
     *     tags={"Pet Types"},
     *
     *     @OA\Response(
     *         response=200,
     *         description="A list of available pet types",
     *
     *         @OA\JsonContent(
     *             type="array",
     *
     *             @OA\Items(
     *                 type="object",
     *
     *                 @OA\Property(property="id", type="integer", example=1),
     *                 @OA\Property(property="name", type="string", example="Cat"),
     *                 @OA\Property(property="slug", type="string", example="cat"),
     *                 @OA\Property(property="description", type="string", example="Feline companions")
     *             )
     *         )
     *     )
     * )
     */
    public function petTypes()
    {
        $petTypes = PetType::active()->ordered()->get();

        return $this->sendSuccess($petTypes);
    }
}
