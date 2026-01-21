<?php

declare(strict_types=1);

namespace App\Http\Controllers\MedicalNote;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/pets/{pet}/medical-notes',
    summary: 'List medical notes for a pet',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'List of medical notes',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'data',
                        type: 'object',
                        properties: [
                            new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/MedicalNote')),
                            new OA\Property(property: 'links', type: 'object'),
                            new OA\Property(property: 'meta', type: 'object'),
                        ]
                    ),
                ]
            )
        ),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
    ]
)]
class ListMedicalNotesController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet)
    {
        // For now, reuse 'medical' capability as the gate for notes
        $this->validatePetResource($request, $pet, 'medical');

        $items = $pet->medicalNotes()->orderByDesc('record_date')->paginate(25);
        $payload = [
            'data' => $items->items(),
            'links' => [
                'first' => $items->url(1),
                'last' => $items->url($items->lastPage()),
                'prev' => $items->previousPageUrl(),
                'next' => $items->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $items->currentPage(),
                'from' => $items->firstItem(),
                'last_page' => $items->lastPage(),
                'path' => $items->path(),
                'per_page' => $items->perPage(),
                'to' => $items->lastItem(),
                'total' => $items->total(),
            ],
        ];

        return response()->json(['data' => $payload]);
    }
}
