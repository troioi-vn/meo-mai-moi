<?php

declare(strict_types=1);

namespace App\Http\Controllers\VaccinationRecordPhoto;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\VaccinationRecord;
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
                    new OA\Property(property: 'base_version', type: 'string', description: 'Required for health:write PATs'),
                    new OA\Property(property: 'expected_photo_id', type: 'integer', nullable: true, description: 'Current photo ID, or null when absent; required for health:write PATs'),
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
        new OA\Response(response: 409, description: 'Version or expected photo conflict'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class StoreVaccinationRecordPhotoController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, VaccinationRecord $record): JsonResponse
    {
        $this->validatePetResource($request, $pet, 'vaccinations', $record);
        $token = $request->user()?->currentAccessToken();
        $isMcpWrite = $token instanceof PersonalAccessToken && $token->can('health:write');
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $record)) {
            return $conflict;
        }

        $validated = $this->validateWithErrorHandling($request, [
            'photo' => $this->imageValidationRules(),
            'base_version' => [$isMcpWrite ? 'required' : 'sometimes', 'string'],
            'expected_photo_id' => [$isMcpWrite ? 'present' : 'sometimes', 'nullable', 'integer', 'min:1'],
        ]);
        $currentPhotoId = $record->getFirstMedia('photo')?->id;
        if (array_key_exists('expected_photo_id', $validated)
            && $currentPhotoId !== ($validated['expected_photo_id'] ?? null)) {
            return $this->sendError(__('messages.offline.version_conflict'), 409);
        }

        // Single file collection - this will replace any existing photo
        $record->addMediaFromRequest('photo')
            ->toMediaCollection('photo');

        $record->touch();
        $record->refresh();

        return $this->sendSuccess($record);
    }
}
