<?php

declare(strict_types=1);

namespace App\Http\Controllers\WeightHistory;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\WeightHistory;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/api/pets/{pet}/weights/{weight}',
    summary: 'Update a weight record',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'weight', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
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
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class UpdateWeightController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;

    public function __invoke(Request $request, Pet $pet, WeightHistory $weight)
    {
        $this->validatePetResource($request, $pet, 'weight', $weight);

        $validatedData = $request->validate([
            'weight_kg' => 'sometimes|numeric|min:0',
            'record_date' => [
                'sometimes',
                'date',
            ],
        ]);

        if (array_key_exists('record_date', $validatedData)) {
            $exists = $pet->weightHistories()
                ->where('id', '!=', $weight->id)
                ->whereDate('record_date', $validatedData['record_date'])
                ->exists();
            if ($exists) {
                throw ValidationException::withMessages([
                    'record_date' => ['The record date has already been taken for this pet.'],
                ]);
            }
        }

        $weight->update($validatedData);

        return $this->sendSuccess($weight);
    }
}
