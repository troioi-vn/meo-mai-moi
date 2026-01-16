<?php

namespace App\Http\Controllers\PetMicrochip;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/pets/{pet}/microchips',
    summary: 'Add a new microchip record for a pet',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'pet',
            in: 'path',
            required: true,
            description: 'ID of the pet to add a microchip record for',
            schema: new OA\Schema(type: 'integer')
        ),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['chip_number'],
            properties: [
                new OA\Property(property: 'chip_number', type: 'string', example: '982000123456789'),
                new OA\Property(property: 'issuer', type: 'string', example: 'HomeAgain'),
                new OA\Property(property: 'implanted_at', type: 'string', format: 'date', example: '2024-01-15'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'Microchip record created successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', ref: '#/components/schemas/PetMicrochip'),
                ]
            )
        ),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 404, description: 'Not found'),
        new OA\Response(response: 422, description: 'Validation error'),
    ]
)]
class StorePetMicrochipController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet)
    {
        $this->authorizeUser($request, 'update', $pet);
        $this->ensurePetCapability($pet, 'microchips');

        $validated = $this->validateWithErrorHandling($request, [
            'chip_number' => [
                'required',
                'string',
                'min:10',
                'max:20',
                $this->uniqueValidationRule('pet_microchips', 'chip_number'),
            ],
            'issuer' => $this->textValidationRules(false),
            'implanted_at' => $this->dateValidationRules(false, false),
        ]);

        $microchip = $pet->microchips()->create($validated);

        return $this->sendSuccessWithMeta($microchip, 'Microchip record created successfully.', 201);
    }
}
