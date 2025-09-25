<?php

namespace App\Http\Controllers;

use App\Models\Pet;
use App\Models\PetType;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;
use App\Enums\PetStatus;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use App\Models\FosterAssignment;
use Illuminate\Support\Facades\Schema;
use App\Models\OwnershipHistory;

/**
 * @OA\Schema(
 *     schema="Pet",
 *     type="object",
 *     title="Pet",
 *     required={"id", "name", "breed", "birthday", "location", "description", "status", "user_id", "pet_type_id"},
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="Whiskers"),
 *     @OA\Property(property="breed", type="string", example="Siamese"),
 *     @OA\Property(property="birthday", type="string", format="date", example="2020-01-01"),
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
     *     @OA\Response(
     *         response=200,
     *         description="A list of the user's pets",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(ref="#/components/schemas/Pet")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function myPets(Request $request)
    {
        if (!$request->user()) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $query = Pet::where('user_id', $request->user()->id)->with('petType');

        if ($request->filled('pet_type')) {
            $slug = $request->query('pet_type');
            $query->whereHas('petType', function($q) use ($slug) {
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
     *     @OA\Response(
     *         response=200,
     *         description="A list of the user's pets, organized by section",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="owned", type="array", @OA\Items(ref="#/components/schemas/Pet")),
     *             @OA\Property(property="fostering_active", type="array", @OA\Items(ref="#/components/schemas/Pet")),
     *             @OA\Property(property="fostering_past", type="array", @OA\Items(ref="#/components/schemas/Pet")),
     *             @OA\Property(property="transferred_away", type="array", @OA\Items(ref="#/components/schemas/Pet"))
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function myPetsSections(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return $this->sendError('Unauthenticated.', 401);
        }

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
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the pet",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="The pet",
     *         @OA\JsonContent(ref="#/components/schemas/Pet")
     *     ),
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

        // Centralize access via policy
        $this->authorize('view', $pet);

        $user = $request->user();
        $isOwner = $user && $pet->user_id === $user->id;
        $isAdmin = $user && method_exists($user, 'hasRole') ? $user->hasRole(['admin', 'super_admin']) : false;

        $viewerPermissions = [
            'can_edit' => $isOwner || $isAdmin,
            'can_view_contact' => $isAdmin || ($user && !$isOwner),
        ];
        $pet->setAttribute('viewer_permissions', $viewerPermissions);
        return $this->sendSuccess($pet);
    }

    /**
     * @OA\Get(
     *     path="/api/pets/featured",
     *     summary="Get a list of featured pets",
     *     tags={"Pets"},
     *     @OA\Response(
     *         response=200,
     *         description="A list of featured pets",
     *         @OA\JsonContent(
     *             type="array",
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
     *     @OA\Response(
     *         response=200,
     *         description="A list of pets with open placement requests",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(ref="#/components/schemas/Pet")
     *         )
     *     )
     * )
     */
    public function placementRequests(Request $request)
    {
        $pets = Pet::whereHas('placementRequests', function ($query) {
            $query->where('is_active', true)->where('status', \App\Enums\PlacementRequestStatus::OPEN->value);
        })->with(['placementRequests', 'petType'])->get();

        return $this->sendSuccess($pets);
    }

    /**
     * @OA\Post(
     *     path="/api/pets",
     *     summary="Create a new pet",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(ref="#/components/schemas/Pet")
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Pet created successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Pet")
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'breed' => 'required|string|max:255',
            'birthday' => 'required|date',
            'location' => 'required|string|max:255',
            'description' => 'required|string',
            'pet_type_id' => 'nullable|exists:pet_types,id',
        ]);

        $petTypeId = $validatedData['pet_type_id'] ?? PetType::where('slug', 'cat')->value('id');
        if (!$petTypeId) {
            // Fallback: create Cat type if missing (should not happen in seeded env)
            $petTypeId = PetType::create([
                'name' => 'Cat',
                'slug' => 'cat',
                'is_active' => true,
                'is_system' => true,
                'display_order' => 0,
            ])->id;
        }

        $pet = Pet::create([
            'name' => $validatedData['name'],
            'breed' => $validatedData['breed'],
            'birthday' => $validatedData['birthday'],
            'location' => $validatedData['location'],
            'description' => $validatedData['description'],
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
            if (!$hasOpen) {
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
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the pet to update",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(ref="#/components/schemas/Pet")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Pet updated successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Pet")
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
    public function update(Request $request, Pet $pet)
    {
        $user = $request->user();
        if (!$user) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $this->authorize('update', $pet);

        $validatedData = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'breed' => 'sometimes|required|string|max:255',
            'birthday' => 'sometimes|required|date',
            'location' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'pet_type_id' => 'sometimes|required|exists:pet_types,id',
        ]);

        $pet->fill($validatedData);
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
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="ID of the pet to delete",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"password"},
     *             @OA\Property(property="password", type="string", format="password", description="User's current password for confirmation")
     *         )
     *     ),
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
        $user = $request->user();
        if (!$user) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $this->authorize('delete', $pet);

        if (!Hash::check($request->input('password'), $user->password)) {
            return $this->sendError('The provided password does not match our records.', 422);
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
     *     @OA\Parameter(name="id", in="path", required=true, description="ID of the pet to update", @OA\Schema(type="integer")),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"status", "password"},
     *             @OA\Property(property="status", type="string", enum=App\Enums\PetStatus::class, example="lost"),
     *             @OA\Property(property="password", type="string", format="password", description="User's current password for confirmation")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Pet status updated successfully",
     *         @OA\JsonContent(ref="#/components/schemas/Pet")
     *     ),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=422, description="Validation Error")
     * )
     */
    public function updateStatus(Request $request, Pet $pet)
    {
        $user = $request->user();
        if (!$user) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $this->authorize('update', $pet);

        $validated = $request->validate([
            'status' => ['required', 'string', new \Illuminate\Validation\Rules\Enum(PetStatus::class)],
            'password' => 'required|string',
        ]);

        if (!Hash::check($validated['password'], $user->password)) {
            return $this->sendError('The provided password does not match our records.', 422);
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
     *     @OA\Response(
     *         response=200,
     *         description="A list of available pet types",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(
     *                 type="object",
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