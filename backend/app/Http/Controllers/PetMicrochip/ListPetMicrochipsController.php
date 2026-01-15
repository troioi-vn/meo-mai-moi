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

#[OA\Get(
    path: "/api/pets/{pet}/microchips",
    summary: "List microchips for a pet",
    tags: ["Pets"],
    security: [["sanctum" => []]],
    parameters: [
        new OA\Parameter(name: "pet", in: "path", required: true, schema: new OA\Schema(type: "integer")),
        new OA\Parameter(name: "page", in: "query", required: false, schema: new OA\Schema(type: "integer")),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: "List of microchips",
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: "data", type: "object",
                        properties: [
                            new OA\Property(property: "data", type: "array", items: new OA\Items(ref: "#/components/schemas/PetMicrochip")),
                            new OA\Property(property: "links", type: "object"),
                            new OA\Property(property: "meta", type: "object"),
                        ]
                    ),
                ]
            )
        ),
        new OA\Response(response: 401, description: "Unauthenticated"),
        new OA\Response(response: 403, description: "Forbidden"),
        new OA\Response(response: 404, description: "Not found"),
        new OA\Response(response: 422, description: "Feature not available for this pet type"),
    ]
)]
class ListPetMicrochipsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet)
    {
        $this->authorizeUser($request, 'view', $pet);
        $this->ensurePetCapability($pet, 'microchips');

        $microchips = $pet->microchips()
            ->orderBy('implanted_at', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(25);

        $payload = $this->paginatedResponse($microchips, [
            'meta' => array_merge($this->paginatedResponse($microchips)['meta'], [
                'path' => $microchips->path(),
            ]),
        ]);

        return response()->json(['data' => $payload]);
    }
}