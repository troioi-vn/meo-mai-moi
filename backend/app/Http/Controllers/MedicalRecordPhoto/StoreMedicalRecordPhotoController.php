<?php

declare(strict_types=1);

namespace App\Http\Controllers\MedicalRecordPhoto;

use App\Http\Controllers\Controller;
use App\Models\MedicalRecord;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesOfflineVersionChecks;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/pets/{pet}/medical-records/{record}/photos',
    summary: 'Upload a photo for a medical record',
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
                    new OA\Property(property: 'base_version', type: 'string', description: 'Required for health:write PATs'),
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
                    new OA\Property(property: 'data', ref: '#/components/schemas/MedicalRecord'),
                ]
            )
        ),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 409, description: 'Version conflict'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class StoreMedicalRecordPhotoController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, MedicalRecord $record): JsonResponse
    {
        $this->validatePetResource($request, $pet, 'medical', $record);
        $token = $request->user()?->currentAccessToken();
        $isMcpWrite = $token instanceof PersonalAccessToken && $token->can('health:write');
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $record)) {
            return $conflict;
        }

        $this->validateWithErrorHandling($request, [
            'photo' => $this->imageValidationRules(),
            'base_version' => [$isMcpWrite ? 'required' : 'sometimes', 'string'],
        ]);

        $record->addMediaFromRequest('photo')
            ->toMediaCollection('photos');

        $record->touch();
        $record->refresh();

        return $this->sendSuccess($record);
    }
}
