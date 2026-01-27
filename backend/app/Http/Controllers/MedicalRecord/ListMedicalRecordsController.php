<?php

declare(strict_types=1);

namespace App\Http\Controllers\MedicalRecord;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/pets/{pet}/medical-records',
    summary: 'List medical records for a pet',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'record_type', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['vaccination', 'vet_visit', 'medication', 'treatment', 'other']), description: 'Filter by record type'),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'List of medical records',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'data',
                        type: 'object',
                        properties: [
                            new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/MedicalRecord')),
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
class ListMedicalRecordsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet)
    {
        $this->validatePetResource($request, $pet, 'medical');

        $query = $pet->medicalRecords();

        // Apply record_type filter if provided
        $recordType = $request->query('record_type');
        if ($recordType) {
            $query->where('record_type', $recordType);
        }

        $items = $query->orderByDesc('record_date')->paginate(25);
        $payload = $this->paginatedResponse($items, [
            'meta' => array_merge($this->paginatedResponse($items)['meta'], [
                'path' => $items->path(),
            ]),
        ]);

        return $this->sendSuccess($payload);
    }
}
