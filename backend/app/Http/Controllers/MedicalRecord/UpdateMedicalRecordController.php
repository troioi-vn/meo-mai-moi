<?php

namespace App\Http\Controllers\MedicalRecord;

use App\Http\Controllers\Controller;
use App\Models\MedicalRecord;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/api/pets/{pet}/medical-records/{record}',
    summary: 'Update a medical record',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'record', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'record_type', type: 'string', enum: ['vaccination', 'vet_visit', 'medication', 'treatment', 'other']),
                new OA\Property(property: 'description', type: 'string'),
                new OA\Property(property: 'record_date', type: 'string', format: 'date'),
                new OA\Property(property: 'vet_name', type: 'string'),
                new OA\Property(property: 'attachment_url', type: 'string'),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 200, description: 'OK', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/MedicalRecord')])),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class UpdateMedicalRecordController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, MedicalRecord $record)
    {
        $this->validatePetResource($request, $pet, 'medical', $record);

        $validated = $this->validateWithErrorHandling($request, [
            'record_type' => ['sometimes', 'string', 'in:vaccination,vet_visit,medication,treatment,other'],
            'description' => $this->textValidationRules(false, 2000),
            'record_date' => $this->dateValidationRules(false, false),
            'vet_name' => $this->textValidationRules(false, 255),
            'attachment_url' => ['nullable', 'string', 'url', 'max:2048'],
        ]);

        $record->update($validated);

        return $this->sendSuccess($record);
    }
}
