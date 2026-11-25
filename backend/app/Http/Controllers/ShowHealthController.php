<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\HealthCheckService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

#[OA\Get(
    path: '/api/health',
    summary: 'Report whether the database answers and the queue is moving',
    description: 'Always 200. `status` is `degraded` when `problems` is not empty: `database` when PostgreSQL does not answer, `queue` when a due job has waited more than 15 minutes for a worker.',
    tags: ['System'],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Health status',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean'),
                    new OA\Property(property: 'message', type: 'string'),
                    new OA\Property(
                        property: 'data',
                        properties: [
                            new OA\Property(property: 'status', type: 'string', enum: ['ok', 'degraded']),
                            new OA\Property(property: 'problems', type: 'array', items: new OA\Items(type: 'string', enum: ['database', 'queue'])),
                        ],
                        type: 'object'
                    ),
                ]
            )
        ),
    ]
)]
class ShowHealthController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(HealthCheckService $health): JsonResponse
    {
        $problems = $health->problems();

        return $this->sendSuccess([
            'status' => $problems === [] ? 'ok' : 'degraded',
            'problems' => $problems,
        ]);
    }
}
