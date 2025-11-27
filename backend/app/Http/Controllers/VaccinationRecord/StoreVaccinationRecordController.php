<?php

namespace App\Http\Controllers\VaccinationRecord;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Post(
 *     path="/api/pets/{pet}/vaccinations",
 *     summary="Create a vaccination record",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
 *
 *     @OA\RequestBody(required=true, @OA\JsonContent(
 *         required={"vaccine_name","administered_at"},
 *
 *         @OA\Property(property="vaccine_name", type="string", example="Rabies"),
 *         @OA\Property(property="administered_at", type="string", format="date", example="2024-06-01"),
 *         @OA\Property(property="due_at", type="string", format="date", example="2025-06-01"),
 *         @OA\Property(property="notes", type="string", example="Booster due next year"),
 *     )),
 *
 *     @OA\Response(response=201, description="Created", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/VaccinationRecord"))),
 *     @OA\Response(response=401, description="Unauthenticated"),
 *     @OA\Response(response=403, description="Forbidden"),
 *     @OA\Response(response=422, description="Validation error")
 * )
 */
class StoreVaccinationRecordController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet)
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
}
