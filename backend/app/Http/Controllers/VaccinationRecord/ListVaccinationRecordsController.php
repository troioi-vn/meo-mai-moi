<?php

declare(strict_types=1);

namespace App\Http\Controllers\VaccinationRecord;

use App\Http\Controllers\Controller;
use App\Models\Pet;
use App\Models\VaccinationRecord;
use App\Traits\ApiResponseTrait;
use App\Traits\HandlesAuthentication;
use App\Traits\HandlesPetResources;
use App\Traits\HandlesValidation;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/pets/{pet}/vaccinations',
    summary: 'List vaccination records for a pet',
    tags: ['Pets'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'pet', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'status', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['active', 'completed', 'all']), description: 'Filter by status: active (default), completed, or all'),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'List of vaccination records',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', type: 'object', properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/VaccinationRecord')),
                        new OA\Property(property: 'links', type: 'object'),
                        new OA\Property(property: 'meta', type: 'object'),
                    ]),
                ]
            )
        ),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 403, description: 'Forbidden'),
    ]
)]
class ListVaccinationRecordsController extends Controller
{
    use ApiResponseTrait;
    use HandlesAuthentication;
    use HandlesPetResources;
    use HandlesValidation;

    public function __invoke(Request $request, Pet $pet)
    {
        $this->validatePetResource($request, $pet, 'vaccinations');

        $status = $request->query('status', 'active');

        $query = VaccinationRecord::query()->whereBelongsTo($pet);

        // Apply status filter
        if ($status === 'active') {
            $query->active();
        } elseif ($status === 'completed') {
            $query->completed();
        }
        // 'all' returns everything without filter

        $items = $query->orderByDesc('administered_at')->paginate(25);
        $payload = $this->paginatedResponse($items, [
            'meta' => array_merge($this->paginatedResponse($items)['meta'], [
                'path' => $items->path(),
            ]),
        ]);

        return $this->sendSuccess($payload);
    }
}
