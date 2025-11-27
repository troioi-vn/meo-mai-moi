<?php

namespace App\Http\Controllers\WeightHistory;

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
 *
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
class StoreWeightController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet)
    {
        // Only the pet's owner or an admin can add weight records
        $this->validatePetResource($request, $pet, 'weight');

        $validatedData = $this->validateWithErrorHandling($request, [
            'weight_kg' => $this->numericValidationRules(true, 0),
            'record_date' => $this->dateValidationRules(),
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
}
