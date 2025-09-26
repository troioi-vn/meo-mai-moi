<?php

namespace App\Http\Controllers;

use App\Models\Pet;
use App\Models\WeightHistory;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use App\Services\PetCapabilityService;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

/**
 * @OA\Schema(
 *     schema="WeightHistory",
 *     title="WeightHistory",
 *     description="Weight History model",
 *
 *     @OA\Property(property="id", type="integer", format="int64", description="Weight History ID"),
 *     @OA\Property(property="pet_id", type="integer", format="int64", description="ID of the associated pet"),
 *     @OA\Property(property="weight_kg", type="number", format="float", description="Recorded weight in kilograms"),
 *     @OA\Property(property="record_date", type="string", format="date", description="Date the weight was recorded"),
 *     @OA\Property(property="created_at", type="string", format="date-time", description="Timestamp of weight record creation"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", description="Timestamp of last weight record update")
 * )
 */
class WeightHistoryController extends Controller
{
    use ApiResponseTrait;

    /**
     * @OA\Get(
     *     path="/api/pets/{pet}/weights",
     *     summary="List weight records for a pet",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="page", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="List of weight records",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/WeightHistory")),
     *                 @OA\Property(property="links", type="object"),
     *                 @OA\Property(property="meta", type="object")
     *             )
     *         )
     *     ),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function index(Request $request, Pet $pet)
    {
        $user = $request->user();
        if (! $user) {
            return $this->sendError('Unauthenticated.', 401);
        }
        // Owner or admin may view; otherwise deny.
        $isOwner = $user->id === $pet->user_id;
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) {
            return $this->sendError('Forbidden.', 403);
        }

        // Capability check
        PetCapabilityService::ensure($pet, 'weight');

        $items = $pet->weightHistories()->orderByDesc('record_date')->paginate(25);

        $payload = [
            'data' => $items->items(),
            'links' => [
                'first' => $items->url(1),
                'last' => $items->url($items->lastPage()),
                'prev' => $items->previousPageUrl(),
                'next' => $items->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $items->currentPage(),
                'from' => $items->firstItem(),
                'last_page' => $items->lastPage(),
                'path' => $items->path(),
                'per_page' => $items->perPage(),
                'to' => $items->lastItem(),
                'total' => $items->total(),
            ],
        ];

        return response()->json(['data' => $payload]);
    }

    /**
     * @OA\Post(
     *     path="/api/pets/{pet}/weights",
     *     summary="Add a new weight record for a pet",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *
     *     @OA\Parameter(
    *         name="pet",
     *         in="path",
     *         required=true,
     *         description="ID of the pet to add a weight record for",
     *
     *         @OA\Schema(type="integer")
     *     ),
     *
     *     @OA\RequestBody(
     *         required=true,
     *
     *         @OA\JsonContent(
     *             required={"weight_kg", "record_date"},
     *
     *             @OA\Property(property="weight_kg", type="number", format="float", example=5.2),
     *             @OA\Property(property="record_date", type="string", format="date", example="2024-01-15")
     *         )
     *     ),
     *
    *     @OA\Response(
    *         response=201,
    *         description="Weight record created successfully",
    *         @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/WeightHistory"))
    *     ),
     *
     *     @OA\Response(
     *         response=422,
     *         description="Validation error",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="message", type="string", example="Validation Error"),
     *             @OA\Property(property="errors", type="object", example={"weight_kg": {"The weight kg field is required."}})
     *         )
     *     ),
     *
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden: You are not authorized to add weight records for this pet."
     *     )
     * )
     */
    public function store(Request $request, Pet $pet)
    {
        // Only the pet's owner or an admin can add weight records
        $user = $request->user();
        if (! $user) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $isOwner = $user->id === $pet->user_id;
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) {
            return $this->sendError('You are not authorized to add weight records for this pet.', 403);
        }

        // Capability check
        PetCapabilityService::ensure($pet, 'weight');

        $validatedData = $request->validate([
            'weight_kg' => 'required|numeric|min:0',
            'record_date' => [
                'required',
                'date',
            ],
        ]);

        // Enforce per-pet uniqueness for record_date using date-only comparison
        if ($pet->weightHistories()->whereDate('record_date', $validatedData['record_date'])->exists()) {
            throw ValidationException::withMessages([
                'record_date' => ['The record date has already been taken for this pet.'],
            ]);
        }

        $weightHistory = $pet->weightHistories()->create($validatedData);

        return $this->sendSuccess($weightHistory, 201);
    }

    /**
     * @OA\Get(
     *     path="/api/pets/{pet}/weights/{weight}",
     *     summary="Get a single weight record",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="weight", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/WeightHistory"))),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function show(Request $request, Pet $pet, WeightHistory $weight)
    {
        $user = $request->user();
        if (! $user) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $isOwner = $user->id === $pet->user_id;
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) {
            return $this->sendError('Forbidden.', 403);
        }
        PetCapabilityService::ensure($pet, 'weight');

        if ($weight->pet_id !== $pet->id) {
            return $this->sendError('Not found.', 404);
        }

        return $this->sendSuccess($weight);
    }

    /**
     * @OA\Put(
     *     path="/api/pets/{pet}/weights/{weight}",
     *     summary="Update a weight record",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="weight", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="weight_kg", type="number", format="float"),
     *         @OA\Property(property="record_date", type="string", format="date")
     *     )),
     *     @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/WeightHistory"))),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=404, description="Not found"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function update(Request $request, Pet $pet, WeightHistory $weight)
    {
        $user = $request->user();
        if (! $user) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $isOwner = $user->id === $pet->user_id;
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) {
            return $this->sendError('Forbidden.', 403);
        }
        PetCapabilityService::ensure($pet, 'weight');

        if ($weight->pet_id !== $pet->id) {
            return $this->sendError('Not found.', 404);
        }

        $validatedData = $request->validate([
            'weight_kg' => 'sometimes|numeric|min:0',
            'record_date' => [
                'sometimes',
                'date',
            ],
        ]);

        if (array_key_exists('record_date', $validatedData)) {
            $exists = $pet->weightHistories()
                ->where('id', '!=', $weight->id)
                ->whereDate('record_date', $validatedData['record_date'])
                ->exists();
            if ($exists) {
                throw ValidationException::withMessages([
                    'record_date' => ['The record date has already been taken for this pet.'],
                ]);
            }
        }

        $weight->update($validatedData);

        return $this->sendSuccess($weight);
    }

    /**
     * @OA\Delete(
     *     path="/api/pets/{pet}/weights/{weight}",
     *     summary="Delete a weight record",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="weight", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Deleted", @OA\JsonContent(@OA\Property(property="data", type="boolean", example=true))),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function destroy(Request $request, Pet $pet, WeightHistory $weight)
    {
        $user = $request->user();
        if (! $user) {
            return $this->sendError('Unauthenticated.', 401);
        }
        $isOwner = $user->id === $pet->user_id;
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) {
            return $this->sendError('Forbidden.', 403);
        }
        PetCapabilityService::ensure($pet, 'weight');

        if ($weight->pet_id !== $pet->id) {
            return $this->sendError('Not found.', 404);
        }

        $weight->delete();

        return response()->json(['data' => true]);
    }
}
