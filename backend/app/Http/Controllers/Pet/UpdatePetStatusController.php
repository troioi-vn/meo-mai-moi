<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Enums\PetStatus;
use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Enum;
use OpenApi\Attributes as OA;

#[OA\Put(
    path: '/api/pets/{id}/status',
    summary: "Update a pet's status",
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'id', in: 'path', required: true, description: 'ID of the pet to update', schema: new OA\Schema(type: 'integer')),
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['status'],
            properties: [
                new OA\Property(property: 'status', type: 'string', enum: PetStatus::class, example: 'lost'),
            ]
        )
    ),
    responses: [
        new OA\Response(
            response: 200,
            description: 'Pet status updated successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/PetResponse')
        ),
        new OA\Response(response: 403, description: 'Forbidden'),
        new OA\Response(response: 422, description: 'Validation Error'),
    ]
)]
class UpdatePetStatusController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;

    public function __invoke(Request $request, Pet $pet)
    {
        $this->authorizeUser($request, 'update', $pet);

        $validated = $request->validate([
            'status' => ['required', 'string', new Enum(PetStatus::class)],
        ]);

        $pet->status = $validated['status'];
        $pet->save();

        $pet->load('petType');

        return $this->sendSuccess($pet);
    }
}
