<?php

declare(strict_types=1);

namespace App\Http\Controllers\WeightHistory;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\WeightHistory;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesOfflineVersionChecks;
use App\Traits\HandlesPetResources;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/api/pets/{pet}/weights/{weight}',
    summary: 'Delete a weight record',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'weight', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    requestBody: new OA\RequestBody(content: new OA\JsonContent(properties: [
        new OA\Property(property: 'base_version', type: 'string', description: 'Required for health:write PATs'),
        new OA\Property(property: 'expected_weight_kg', type: 'number', format: 'float', description: 'Required for health:write PATs'),
        new OA\Property(property: 'expected_record_date', type: 'string', format: 'date', description: 'Required for health:write PATs'),
    ])),
    responses: [
        new OA\Response(response: 200, description: 'Deleted', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', type: 'boolean', example: true)])),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 409, description: 'Version or expected target conflict'),
    ]
)]
class DeleteWeightController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesOfflineVersionChecks;
    use HandlesPetResources;

    public function __invoke(Request $request, Pet $pet, WeightHistory $weight): JsonResponse
    {
        $this->validatePetResource($request, $pet, 'weight', $weight);
        $token = $request->user()?->currentAccessToken();
        $isMcpWrite = $token instanceof PersonalAccessToken && $token->can('health:write');
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $weight)) {
            return $conflict;
        }
        $validated = $request->validate([
            'base_version' => [$isMcpWrite ? 'required' : 'sometimes', 'string'],
            'expected_weight_kg' => [$isMcpWrite ? 'required' : 'sometimes', 'numeric', 'min:0.01', 'max:1000'],
            'expected_record_date' => [$isMcpWrite ? 'required' : 'sometimes', 'date_format:Y-m-d'],
        ]);
        if (isset($validated['expected_weight_kg'])
            && (float) $weight->weight_kg !== (float) $validated['expected_weight_kg']) {
            return $this->sendError(__('messages.offline.version_conflict'), 409);
        }
        if (isset($validated['expected_record_date'])
            && $weight->record_date?->format('Y-m-d') !== $validated['expected_record_date']) {
            return $this->sendError(__('messages.offline.version_conflict'), 409);
        }

        $weight->delete();

        return $this->sendSuccess(true);
    }
}
