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
use OpenApi\Attributes as OA;

#[OA\Put(
    path: "/api/pets/{pet}/vaccinations/{record}",
    summary: "Update a vaccination record",
    tags: ["Pets"],
    security: [["sanctum" => []]],
    parameters: [
        new OA\Parameter(name: "pet", in: "path", required: true, schema: new OA\Schema(type: "integer")),
        new OA\Parameter(name: "record", in: "path", required: true, schema: new OA\Schema(type: "integer"))
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: "vaccine_name", type: "string"),
                new OA\Property(property: "administered_at", type: "string", format: "date"),
                new OA\Property(property: "due_at", type: "string", format: "date"),
                new OA\Property(property: "notes", type: "string")
            ]
        )
    ),
    responses: [
        new OA\Response(response: 200, description: "OK", content: new OA\JsonContent(properties: [new OA\Property(property: "data", ref: "#/components/schemas/VaccinationRecord")])),
        new OA\Response(response: 401, description: "Unauthenticated"),
        new OA\Response(response: 403, description: "Forbidden"),
        new OA\Response(response: 404, description: "Not found"),
        new OA\Response(response: 422, description: "Validation error")
    ]
)]
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
