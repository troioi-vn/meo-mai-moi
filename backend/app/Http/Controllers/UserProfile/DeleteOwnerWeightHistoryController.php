<?php

declare(strict_types=1);

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Models\OwnerWeightHistory;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesOfflineVersionChecks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Delete(
    path: '/api/users/me/owner-weights/{ownerWeightHistory}',
    summary: 'Delete an owner weight record',
    tags: ['User Profile'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'ownerWeightHistory', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    requestBody: new OA\RequestBody(
        required: false,
        content: new OA\JsonContent(properties: [
            new OA\Property(property: 'base_version', type: 'string', format: 'date-time'),
            new OA\Property(property: 'expected_record_date', type: 'string', format: 'date'),
            new OA\Property(property: 'expected_weight_kg', type: 'number', format: 'float', minimum: 0),
        ])
    ),
    responses: [
        new OA\Response(response: 200, description: 'Deleted', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', type: 'boolean', example: true)])),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 404, description: 'Not found'),
    ]
)]
class DeleteOwnerWeightHistoryController extends Controller
{
    use ApiResponseTrait;
    use HandlesOfflineVersionChecks;

    public function __invoke(Request $request, OwnerWeightHistory $ownerWeightHistory): JsonResponse
    {
        if ($ownerWeightHistory->user_id !== $request->user()->id) {
            abort(404);
        }
        if ($conflict = $this->rejectUnlessBaseVersionMatches($request, $ownerWeightHistory)) {
            return $conflict;
        }

        $validated = $request->validate([
            'expected_record_date' => ['sometimes', 'required', 'date_format:Y-m-d'],
            'expected_weight_kg' => ['sometimes', 'required', 'numeric', 'min:0'],
        ]);
        if (isset($validated['expected_record_date'])
            && $ownerWeightHistory->record_date?->format('Y-m-d') !== $validated['expected_record_date']) {
            return $this->sendError(__('messages.offline.version_conflict'), 409);
        }
        if (isset($validated['expected_weight_kg'])
            && abs((float) $ownerWeightHistory->weight_kg - (float) $validated['expected_weight_kg']) > 0.000001) {
            return $this->sendError(__('messages.offline.version_conflict'), 409);
        }

        $ownerWeightHistory->delete();

        return $this->sendSuccess(true);
    }
}
