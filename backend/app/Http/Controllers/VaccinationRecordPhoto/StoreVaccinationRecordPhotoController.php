<?php

declare(strict_types=1);

namespace App\Http\Controllers\VaccinationRecordPhoto;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\VaccinationRecord;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/pets/{pet}/vaccinations/{record}/photo',
    summary: 'Upload a photo for a vaccination record',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'record', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\MediaType(
            mediaType: 'multipart/form-data',
            schema: new OA\Schema(
                properties: [
                    new OA\Property(
                        property: 'photo',
                        type: 'string',
                        format: 'binary',
                        description: 'The photo file (max 10MB, jpeg, png, jpg, gif)'
                    ),
                ]
            )
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Photo uploaded successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/VaccinationRecord'),
                ]
            )
        ),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class StoreVaccinationRecordPhotoController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, VaccinationRecord $record)
    {
        $this->validatePetResource($request, $pet, 'vaccinations', $record);

        $this->validateWithErrorHandling($request, [
            'photo' => $this->imageValidationRules(),
        ]);

        // Single file collection - this will replace any existing photo
        $record->addMediaFromRequest('photo')
            ->toMediaCollection('photo');

        $record->refresh();

        return $this->sendSuccess($record);
    }
}
