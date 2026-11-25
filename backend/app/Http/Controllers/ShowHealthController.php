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
    description: 'Answers 200 whenever the rate limiter admits the request (60 a minute per address; 429 beyond that), including during a database outage. `status` is `degraded` when `problems` is not empty: `database` when PostgreSQL does not answer, `queue` when a due job has waited more than 15 minutes for a worker or the queue cannot be read.',
    tags: ['System'],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Health status',
            content: new OA\JsonContent(ref: '#/components/schemas/HealthResponse')
        ),
        new OA\Response(response: 429, description: 'Too many requests'),
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
