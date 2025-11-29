<?php

namespace App\Http\Controllers\VaccinationRecord;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\VaccinationRecord;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Put(
 *     path="/api/pets/{pet}/vaccinations/{record}",
 *     summary="Update a vaccination record",
 *     tags={"Pets"},
 *     security={{"sanctum": {}}},
 *
 *     @OA\Parameter(name="pet", in="path", required=true, @OA\Schema(type="integer")),
 *     @OA\Parameter(name="record", in="path", required=true, @OA\Schema(type="integer")),
 *
 *     @OA\RequestBody(required=true, @OA\JsonContent(
 *
 *         @OA\Property(property="vaccine_name", type="string"),
 *         @OA\Property(property="administered_at", type="string", format="date"),
 *         @OA\Property(property="due_at", type="string", format="date"),
 *         @OA\Property(property="notes", type="string")
 *     )),
 *
 *     @OA\Response(response=200, description="OK", @OA\JsonContent(@OA\Property(property="data", ref="#/components/schemas/VaccinationRecord"))),
 *     @OA\Response(response=401, description="Unauthenticated"),
 *     @OA\Response(response=403, description="Forbidden"),
 *     @OA\Response(response=404, description="Not found"),
 *     @OA\Response(response=422, description="Validation error")
 * )
 */
class UpdateVaccinationRecordController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, VaccinationRecord $record)
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
}
