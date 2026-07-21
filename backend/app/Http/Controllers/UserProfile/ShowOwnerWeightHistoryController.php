<?php

declare(strict_types=1);

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Models\OwnerWeightHistory;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/users/me/owner-weights/{ownerWeightHistory}',
    summary: 'Get one owner weight record for the authenticated user',
    tags: ['User Profile'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'ownerWeightHistory', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    responses: [
        new OA\Response(response: 200, description: 'Owner weight record', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/WeightHistory')])),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 404, description: 'Not found'),
    ]
)]
class ShowOwnerWeightHistoryController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, OwnerWeightHistory $ownerWeightHistory): JsonResponse
    {
        if ($ownerWeightHistory->user_id !== $request->user()->id) {
            abort(404);
        }

        return $this->sendSuccess($ownerWeightHistory);
    }
}
