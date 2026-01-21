<?php

declare(strict_types=1);

namespace App\Http\Controllers\Pet;

use App\Http\Controllers\Controller;
use App\Models\PetType;
use App\Traits\ApiResponseTrait;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/pet-types',
    summary: 'Get all available pet types',
    tags: ['Pet Types'],
    responses: [
        new OA\Response(
            response: 200,
            description: 'A list of available pet types',
            content: new OA\JsonContent(
                type: 'array',
                items: new OA\Items(
                    type: 'object',
                    properties: [
                        new OA\Property(property: 'id', type: 'integer', example: 1),
                        new OA\Property(property: 'name', type: 'string', example: 'Cat'),
                        new OA\Property(property: 'slug', type: 'string', example: 'cat'),
                        new OA\Property(property: 'description', type: 'string', example: 'Feline companions'),
                    ]
                )
            )
        ),
    ]
)]
class ListPetTypesController extends Controller
{
    use ApiResponseTrait;

    public function __invoke()
    {
        $petTypes = PetType::active()->ordered()->get();

        return $this->sendSuccess($petTypes);
    }
}
