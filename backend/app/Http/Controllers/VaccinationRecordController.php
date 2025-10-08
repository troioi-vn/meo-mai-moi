<?php

namespace App\Http\Controllers;

use App\Models\VaccinationRecord;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Services\PetCapabilityService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

class VaccinationRecordController extends Controller
{
    use ApiResponseTrait;

    /**
     * @OA\Schema(
     *     schema="VaccinationRecord",
     *     title="VaccinationRecord",
     *     description="Vaccination record model",
     *     @OA\Property(property="id", type="integer", format="int64"),
     *     @OA\Property(property="pet_id", type="integer", format="int64"),
     *     @OA\Property(property="vaccine_name", type="string"),
     *     @OA\Property(property="administered_at", type="string", format="date"),
     *     @OA\Property(property="due_at", type="string", format="date"),
     *     @OA\Property(property="notes", type="string"),
     *     @OA\Property(property="reminder_sent_at", type="string", format="date-time"),
     *     @OA\Property(property="created_at", type="string", format="date-time"),
     *     @OA\Property(property="updated_at", type="string", format="date-time")
     * )
     */

    /**
     * @OA\Get(
     *     path="/api/pets/{pet}/vaccinations",
     *     summary="List vaccination records for a pet",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="page", in="query", required=false, @OA\Schema(type="integer")),
     *     @OA\Response(
     *         response=200,
     *         description="List of vaccination records",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/VaccinationRecord")),
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
        if (! $user) return $this->sendError('Unauthenticated.', 401);
        $isOwner = $user->id === $pet->user_id;
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) return $this->sendError('Forbidden.', 403);

        PetCapabilityService::ensure($pet, 'vaccinations');

        $items = $pet->vaccinations()->orderByDesc('administered_at')->paginate(25);
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
     *     path="/api/pets/{pet}/vaccinations",
     *     summary="Create a vaccination record",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"vaccine_name","administered_at"},
     *         @OA\Property(property="vaccine_name", type="string", example="Rabies"),
     *         @OA\Property(property="administered_at", type="string", format="date", example="2024-06-01"),
     *         @OA\Property(property="due_at", type="string", format="date", example="2025-06-01"),
     *         @OA\Property(property="notes", type="string", example="Booster due next year"),
     *     )),
     *     @OA\Response(response=201, description="Created", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/VaccinationRecord"))),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function store(Request $request, Pet $pet)
    {
        $user = $request->user();
        if (! $user) return $this->sendError('Unauthenticated.', 401);
        $isOwner = $user->id === $pet->user_id;
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) return $this->sendError('Forbidden.', 403);

        PetCapabilityService::ensure($pet, 'vaccinations');

        $validated = $request->validate([
            'vaccine_name' => 'required|string',
            'administered_at' => 'required|date',
            'due_at' => 'nullable|date|after_or_equal:administered_at',
            'notes' => 'nullable|string',
        ]);

        // Uniqueness per pet: vaccine_name + administered_at
        $exists = $pet->vaccinations()
            ->where('vaccine_name', $validated['vaccine_name'])
            ->whereDate('administered_at', $validated['administered_at'])
            ->exists();
        if ($exists) {
            throw ValidationException::withMessages([
                'administered_at' => ['This vaccination already exists for this date.'],
            ]);
        }

        $created = $pet->vaccinations()->create($validated);
        return $this->sendSuccess($created, 201);
    }

    /**
     * @OA\Get(
     *     path="/api/pets/{pet}/vaccinations/{record}",
     *     summary="Get a single vaccination record",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="record", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/VaccinationRecord"))),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function show(Request $request, Pet $pet, VaccinationRecord $record)
    {
        $user = $request->user();
        if (! $user) return $this->sendError('Unauthenticated.', 401);
        $isOwner = $user->id === $pet->user_id;
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) return $this->sendError('Forbidden.', 403);
        PetCapabilityService::ensure($pet, 'vaccinations');

        if ($record->pet_id !== $pet->id) return $this->sendError('Not found.', 404);
        return $this->sendSuccess($record);
    }

    /**
     * @OA\Put(
     *     path="/api/pets/{pet}/vaccinations/{record}",
     *     summary="Update a vaccination record",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="record", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="vaccine_name", type="string"),
     *         @OA\Property(property="administered_at", type="string", format="date"),
     *         @OA\Property(property="due_at", type="string", format="date"),
     *         @OA\Property(property="notes", type="string")
     *     )),
     *     @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/VaccinationRecord"))),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=404, description="Not found"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function update(Request $request, Pet $pet, VaccinationRecord $record)
    {
        $user = $request->user();
        if (! $user) return $this->sendError('Unauthenticated.', 401);
        $isOwner = $user->id === $pet->user_id;
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) return $this->sendError('Forbidden.', 403);
        PetCapabilityService::ensure($pet, 'vaccinations');
        if ($record->pet_id !== $pet->id) return $this->sendError('Not found.', 404);

        $validated = $request->validate([
            'vaccine_name' => 'sometimes|string',
            'administered_at' => 'sometimes|date',
            'due_at' => 'nullable|date|after_or_equal:administered_at',
            'notes' => 'nullable|string',
        ]);

        // If administered_at or vaccine_name changes, enforce uniqueness
        $name = $validated['vaccine_name'] ?? $record->vaccine_name;
        $date = $validated['administered_at'] ?? $record->administered_at->format('Y-m-d');
        $exists = $pet->vaccinations()
            ->where('id', '!=', $record->id)
            ->where('vaccine_name', $name)
            ->whereDate('administered_at', $date)
            ->exists();
        if ($exists) {
            throw ValidationException::withMessages([
                'administered_at' => ['This vaccination already exists for this date.'],
            ]);
        }

        $record->update($validated);
        return $this->sendSuccess($record);
    }

    /**
     * @OA\Delete(
     *     path="/api/pets/{pet}/vaccinations/{record}",
     *     summary="Delete a vaccination record",
     *     tags={"Pets"},
     *     security={{"sanctum": {}}},
     *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="record", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Deleted", @OA\JsonContent(@OA\Property(property="data", type="boolean", example=true))),
     *     @OA\Response(response=401, description="Unauthenticated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=404, description="Not found")
     * )
     */
    public function destroy(Request $request, Pet $pet, VaccinationRecord $record)
    {
        $user = $request->user();
        if (! $user) return $this->sendError('Unauthenticated.', 401);
        $isOwner = $user->id === $pet->user_id;
        $isAdmin = method_exists($user, 'hasRole') && $user->hasRole(['admin', 'super_admin']);
        if (! $isOwner && ! $isAdmin) return $this->sendError('Forbidden.', 403);
        PetCapabilityService::ensure($pet, 'vaccinations');
        if ($record->pet_id !== $pet->id) return $this->sendError('Not found.', 404);
        $record->delete();
        return response()->json(['data' => true]);
    }
}
