<?php

declare(strict_types=1);

namespace App\Http\Controllers\VaccinationRecord;

use App\Exceptions\FinanceException;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\VaccinationRecord;
use App\Services\Finance\HealthFinanceService;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesOfflineVersionChecks;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/api/pets/{pet}/vaccinations/{record}',
    summary: 'Delete a vaccination record',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'record', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'linked_transaction', in: 'query', description: 'Required when a finance transaction is linked', schema: new OA\Schema(type: 'string', enum: ['keep', 'delete'])),
    ],
    requestBody: new OA\RequestBody(content: new OA\JsonContent(properties: [
        new OA\Property(property: 'base_version', type: 'string', description: 'Required for health:write PATs'),
        new OA\Property(property: 'expected_vaccine_name', type: 'string', description: 'Required for health:write PATs'),
        new OA\Property(property: 'expected_administered_at', type: 'string', format: 'date', description: 'Required for health:write PATs'),
    ])),
    responses: [
        new OA\Response(response: 200, description: 'Deleted', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', type: 'boolean', example: true)])),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 409, description: 'Version or expected target conflict'),
        new OA\Response(response: 422, description: 'Linked transaction choice required'),
    ]
)]
class DeleteVaccinationRecordController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, VaccinationRecord $record, HealthFinanceService $finance): JsonResponse
    {
        $this->validatePetResource($request, $pet, 'vaccinations', $record, allowAdmin: true);
        $token = $request->user()?->currentAccessToken();
        $isMcpWrite = $token instanceof PersonalAccessToken && $token->can('health:write');
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $record)) {
            return $conflict;
        }
        $validated = $request->validate([
            'base_version' => [$isMcpWrite ? 'required' : 'sometimes', 'string'],
            'expected_vaccine_name' => [$isMcpWrite ? 'required' : 'sometimes', 'string', 'max:255'],
            'expected_administered_at' => [$isMcpWrite ? 'required' : 'sometimes', 'date_format:Y-m-d'],
        ]);
        if (isset($validated['expected_vaccine_name'])
            && ! hash_equals((string) $record->vaccine_name, $validated['expected_vaccine_name'])) {
            return $this->sendError(__('messages.offline.version_conflict'), 409);
        }
        if (isset($validated['expected_administered_at'])
            && $record->administered_at?->format('Y-m-d') !== $validated['expected_administered_at']) {
            return $this->sendError(__('messages.offline.version_conflict'), 409);
        }
        if ($request->query('linked_transaction') === 'delete'
            && $token instanceof PersonalAccessToken
            && $token->can('health:write')
            && ! $token->can('finance:write')) {
            return $this->sendError('Deleting a linked finance transaction requires finance write access.', 403);
        }
        try {
            $finance->deleteRecord($record, $this->requireAuth($request), $request->query('linked_transaction'));
        } catch (FinanceException $e) {
            return $this->sendError($e->getMessage(), $e->status);
        }

        return $this->sendSuccess(true);
    }
}
