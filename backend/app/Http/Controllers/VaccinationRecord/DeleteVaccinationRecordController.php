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
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
    responses: [
        new OA\Response(response: 200, description: 'Deleted', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', type: 'boolean', example: true)])),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 422, description: 'Linked transaction choice required'),
    ]
)]
class DeleteVaccinationRecordController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, VaccinationRecord $record, HealthFinanceService $finance): JsonResponse
    {
        $this->validatePetResource($request, $pet, 'vaccinations', $record, allowAdmin: true);
        try {
            $finance->deleteRecord($record, $request->query('linked_transaction'));
        } catch (FinanceException $e) {
            return $this->sendError($e->getMessage(), $e->status);
        }

        return $this->sendSuccess(true);
    }
}
