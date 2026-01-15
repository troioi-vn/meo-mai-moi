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
use OpenApi\Attributes as OA;

#[OA\Post(
    path: "/api/pets/{pet}/weights",
    summary: "Add a new weight record for a pet",
    tags: ["Pets"],
    security: [["sanctum" => []]],
    parameters: [
        new OA\Parameter(
            name: "pet",
            in: "path",
            required: true,
            description: "ID of the pet to add a weight record for",
            schema: new OA\Schema(type: "integer")
        )
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ["weight_kg", "record_date"],
            properties: [
                new OA\Property(property: "weight_kg", type: "number", format: "float", example: 5.2),
                new OA\Property(property: "record_date", type: "string", format: "date", example: "2024-01-15")
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: "Weight record created successfully",
            content: new OA\JsonContent(properties: [new OA\Property(property: "data", ref: "#/components/schemas/WeightHistory")])
        ),
        new OA\Response(response: 422, description: "Validation error"),
        new OA\Response(response: 401, description: "Unauthenticated"),
        new OA\Response(response: 403, description: "Forbidden")
    ]
)]
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
