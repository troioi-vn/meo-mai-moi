<?php

namespace App\Http\Controllers;

use App\Models\Pet;
use App\Models\VaccinationRecord;
use App\Services\PetCapabilityService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Annotations as OA;

class VaccinationRecordController extends Controller
{
    use ApiResponseTrait, HandlesAuthentication, HandlesPetResources, HandlesValidation;

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
        $this->validatePetResource($request, $pet, 'vaccinations');

        $items = $pet->vaccinations()->orderByDesc('administered_at')->paginate(25);
        $payload = $this->paginatedResponse($items, [
            'meta' => array_merge($this->paginatedResponse($items)['meta'], [
                'path' => $items->path(),
            ]),
        ]);

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
        $this->validatePetResource($request, $pet, 'vaccinations');

        $validated = $this->validateWithErrorHandling($request, [
            'vaccine_name' => $this->textValidationRules(),
            'administered_at' => $this->dateValidationRules(true, false),
            'due_at' => ['nullable', 'date', 'after_or_equal:administered_at'],
            'notes' => $this->textValidationRules(false, 1000),
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
        $this->validatePetResource($request, $pet, 'vaccinations', $record);
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
        $this->validatePetResource($request, $pet, 'vaccinations', $record);

        $validated = $this->validateWithErrorHandling($request, [
            'vaccine_name' => $this->textValidationRules(false),
            'administered_at' => $this->dateValidationRules(false, false),
            'due_at' => ['nullable', 'date', 'after_or_equal:administered_at'],
            'notes' => $this->textValidationRules(false, 1000),
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
        $this->validatePetResource($request, $pet, 'vaccinations', $record);
        $record->delete();
        return response()->json(['data' => true]);
    }
}
