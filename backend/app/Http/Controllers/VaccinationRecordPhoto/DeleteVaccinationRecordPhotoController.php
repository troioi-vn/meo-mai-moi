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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Response;

#[OA\Delete(
    path: '/api/pets/{pet}/vaccinations/{record}/photo',
    summary: 'Delete the photo from a vaccination record',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'record', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    requestBody: new OA\RequestBody(content: new OA\JsonContent(properties: [
        new OA\Property(property: 'base_version', type: 'string', description: 'Required for health:write PATs'),
        new OA\Property(property: 'expected_photo_id', type: 'integer', description: 'Required for health:write PATs'),
    ])),
    responses: [
        new OA\Response(response: 204, description: 'Photo deleted successfully'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 409, description: 'Version or expected photo conflict'),
    ]
)]
class DeleteVaccinationRecordPhotoController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;
    use HandlesPetResources;

    public function __invoke(Request $request, Pet $pet, VaccinationRecord $record): JsonResponse|Response
    {
        $this->validatePetResource($request, $pet, 'vaccinations', $record);
        $token = $request->user()?->currentAccessToken();
        $isMcpWrite = $token instanceof PersonalAccessToken && $token->can('health:write');
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $record)) {
            return $conflict;
        }
        $validated = $request->validate([
            'base_version' => [$isMcpWrite ? 'required' : 'sometimes', 'string'],
            'expected_photo_id' => [$isMcpWrite ? 'required' : 'sometimes', 'integer', 'min:1'],
        ]);

        $media = $record->getFirstMedia('photo');

        if (! $media) {
            return $this->sendError(__('messages.pets.photo_not_found'), 404);
        }
        if (isset($validated['expected_photo_id'])
            && $media->id !== (int) $validated['expected_photo_id']) {
            return $this->sendError(__('messages.offline.version_conflict'), 409);
        }

        $media->delete();
        $record->touch();

        return $this->sendNoContent();
    }
}
