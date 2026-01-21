<?php

declare(strict_types=1);

namespace App\Http\Controllers\PetMicrochip;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\PetMicrochip;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/api/pets/{pet}/microchips/{microchip}',
    summary: 'Update a microchip record',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'microchip', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'chip_number', type: 'string'),
                new OA\Property(property: 'issuer', type: 'string'),
                new OA\Property(property: 'implanted_at', type: 'string', format: 'date'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'OK',
            content: new OA\JsonContent(properties: [new OA\Property(property: 'data', ref: '#/components/schemas/PetMicrochip')])
        ),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class UpdatePetMicrochipController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet, PetMicrochip $microchip)
    {
        $this->authorizeUser($request, 'update', $pet);
        $this->validatePetResource($request, $pet, 'microchips', $microchip);

        $validated = $this->validateWithErrorHandling($request, [
            'chip_number' => [
                'sometimes',
                'required',
                'string',
                'min:10',
                'max:20',
                $this->uniqueValidationRule('pet_microchips', 'chip_number', [], $microchip->id),
            ],
            'issuer' => $this->textValidationRules(false),
            'implanted_at' => $this->dateValidationRules(false, false),
        ]);

        $microchip->update($validated);

        return $this->sendSuccessWithMeta($microchip, 'Microchip record updated successfully.');
    }
}
