<?php

declare(strict_types=1);

namespace App\Http\Controllers\VaccinationRecord;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\VaccinationRecord;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesOfflineVersionChecks;
use App\Traits\HandlesPetResources;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/pets/{pet}/vaccinations/{record}/reactivate',
    summary: 'Make a renewed vaccination active again, keeping its original dates',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'record', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    requestBody: new OA\RequestBody(
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'base_version', type: 'string'),
        ])
    ),
    responses: [
        new OA\Response(response: 200, description: 'Active record', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/VaccinationRecord')])),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 409, description: 'Version conflict'),
    ]
)]
class ReactivateVaccinationRecordController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;
    use HandlesPetResources;

    public function __invoke(Request $request, Pet $pet, VaccinationRecord $record): JsonResponse
    {
        $this->validatePetResource($request, $pet, 'vaccinations', $record);

        if ($conflictResponse = $this->rejectUnlessBaseVersionMatches($request, $record)) {
            return $conflictResponse;
        }

        if ($record->isCompleted()) {
            $record->update(['completed_at' => null]);
        }

        return $this->sendSuccess($record);
    }
}
