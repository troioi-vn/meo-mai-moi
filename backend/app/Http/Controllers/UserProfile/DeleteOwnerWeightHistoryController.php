<?php

declare(strict_types=1);

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Models\OwnerWeightHistory;
use App\Traits\ApiResponseTrait;
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
    responses: [
        new OA\Response(response: 200, description: 'Deleted', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', type: 'boolean', example: true)])),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 404, description: 'Not found'),
    ]
)]
class DeleteOwnerWeightHistoryController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, OwnerWeightHistory $ownerWeightHistory): JsonResponse
    {
        if ($ownerWeightHistory->user_id !== $request->user()->id) {
            abort(404);
        }

        $ownerWeightHistory->delete();

        return $this->sendSuccess(true);
    }
}
