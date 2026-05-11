<?php

declare(strict_types=1);

namespace App\Http\Controllers\UserProfile;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/users/me/owner-weights',
    summary: 'List owner weight records for the authenticated user',
    tags: ['User Profile'],
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'List of owner weight records',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'data', type: 'object', properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/WeightHistory')),
                        new OA\Property(property: 'links', type: 'object'),
                        new OA\Property(property: 'meta', type: 'object'),
                    ]),
                ]
            )
        ),
        new OA\Response(response: 401, description: 'Unauthenticated'),
    ]
)]
class ListOwnerWeightHistoryController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(Request $request): JsonResponse
    {
        $items = $request->user()->ownerWeightHistories()->orderByDesc('record_date')->paginate(25);

        return $this->sendSuccess([
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
        ]);
    }
}