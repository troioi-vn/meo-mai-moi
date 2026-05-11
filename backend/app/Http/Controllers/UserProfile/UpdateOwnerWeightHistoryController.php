<?php

declare(strict_types=1);

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Models\OwnerWeightHistory;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/api/users/me/owner-weights/{ownerWeightHistory}',
    summary: 'Update an owner weight record',
    tags: ['User Profile'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'ownerWeightHistory', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'weight_kg', type: 'number', format: 'float'),
                new OA\Property(property: 'record_date', type: 'string', format: 'date'),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 200, description: 'OK', content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/WeightHistory')])),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class UpdateOwnerWeightHistoryController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request, OwnerWeightHistory $ownerWeightHistory): JsonResponse
    {
        if ($ownerWeightHistory->user_id !== $request->user()->id) {
            abort(404);
        }

        $validatedData = $request->validate([
            'weight_kg' => 'sometimes|numeric|min:0',
            'record_date' => ['sometimes', 'date'],
        ]);

        if (array_key_exists('record_date', $validatedData)) {
            $exists = $request->user()->ownerWeightHistories()
                ->where('id', '!=', $ownerWeightHistory->id)
                ->whereDate('record_date', $validatedData['record_date'])
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages([
                    'record_date' => ['The record date has already been taken for this user.'],
                ]);
            }
        }

        $ownerWeightHistory->update($validatedData);

        return $this->sendSuccess($ownerWeightHistory);
    }
}
