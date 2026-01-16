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
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/pets/{pet}/vaccinations/{record}/renew',
    summary: 'Renew a vaccination record (mark old as completed, create new)',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'record', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['vaccine_name', 'administered_at'],
            properties: [
                new OA\Property(property: 'vaccine_name', type: 'string', example: 'Rabies'),
                new OA\Property(property: 'administered_at', type: 'string', format: 'date', example: '2024-11-30'),
                new OA\Property(property: 'due_at', type: 'string', format: 'date', example: '2025-11-30'),
                new OA\Property(property: 'notes', type: 'string', example: 'Annual renewal'),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 201, description: 'Created', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/VaccinationRecord')])),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class RenewVaccinationRecordController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, VaccinationRecord $record)
    {
        $this->validatePetResource($request, $pet, 'vaccinations', $record);

        // Cannot renew an already completed record
        if ($record->isCompleted()) {
            throw ValidationException::withMessages([
                'record' => ['This vaccination record has already been completed and cannot be renewed.'],
            ]);
        }

        $validated = $this->validateWithErrorHandling($request, [
            'vaccine_name' => $this->textValidationRules(),
            'administered_at' => $this->dateValidationRules(true, false),
            'due_at' => ['nullable', 'date', 'after_or_equal:administered_at'],
            'notes' => $this->textValidationRules(false, 1000),
        ]);

        // Check uniqueness for the new record (only among active records)
        $exists = VaccinationRecord::query()
            ->whereBelongsTo($pet)
            ->active()
            ->where('id', '!=', $record->id)
            ->where('vaccine_name', $validated['vaccine_name'])
            ->whereDate('administered_at', $validated['administered_at'])
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'administered_at' => ['An active vaccination with this name already exists for this date.'],
            ]);
        }

        $newRecord = DB::transaction(function () use ($pet, $record, $validated) {
            // Mark the old record as completed
            $record->markAsCompleted();

            // Create the new vaccination record
            return $pet->vaccinations()->create($validated);
        });

        return $this->sendSuccess($newRecord, 201);
    }
}
