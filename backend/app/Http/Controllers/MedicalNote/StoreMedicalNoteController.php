<?php

declare(strict_types=1);

namespace App\Http\Controllers\MedicalNote;

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
    path: '/api/pets/{pet}/medical-notes',
    summary: 'Create a medical note',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['note', 'record_date'],
            properties: [
                new OA\Property(property: 'note', type: 'string', example: 'Rabies vaccination'),
                new OA\Property(property: 'record_date', type: 'string', format: 'date', example: '2024-06-01'),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 201, description: 'Created', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/MedicalNote')])),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class StoreMedicalNoteController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet)
    {
        $this->validatePetResource($request, $pet, 'medical');

        $validated = $request->validate([
            'note' => 'required|string',
            'record_date' => 'required|date',
        ]);

        // Enforce per-pet uniqueness by date
        if ($pet->medicalNotes()->whereDate('record_date', $validated['record_date'])->exists()) {
            throw ValidationException::withMessages([
                'record_date' => ['The record date has already been taken for this pet.'],
            ]);
        }

        $created = $pet->medicalNotes()->create($validated);

        return $this->sendSuccess($created, 201);
    }
}
