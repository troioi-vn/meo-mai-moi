<?php

declare(strict_types=1);

namespace App\Http\Controllers\ErrorEvent;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreErrorEventRequest;
use App\Models\User;
use App\Services\ErrorEventService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/error-events',
    summary: 'Report a browser runtime error',
    description: 'Stores a capped browser error payload for later operational triage. Authentication is optional.',
    tags: ['Operations'],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['message', 'route'],
            properties: [
                new OA\Property(property: 'message', type: 'string', maxLength: 2000),
                new OA\Property(property: 'exception_class', type: 'string', maxLength: 255, nullable: true),
                new OA\Property(property: 'stack', type: 'string', maxLength: 20000, nullable: true),
                new OA\Property(property: 'route', type: 'string', maxLength: 2048),
                new OA\Property(property: 'method', type: 'string', maxLength: 10, nullable: true),
                new OA\Property(property: 'status_code', type: 'integer', minimum: 100, maximum: 599, nullable: true),
                new OA\Property(property: 'app_version', type: 'string', maxLength: 100, nullable: true),
                new OA\Property(property: 'context', type: 'object', nullable: true, additionalProperties: true),
                new OA\Property(property: 'occurred_at', type: 'string', format: 'date-time', nullable: true),
            ],
            type: 'object',
        ),
    ),
    responses: [
        new OA\Response(
            response: 201,
            description: 'Error event stored',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(property: 'data', properties: [
                        new OA\Property(property: 'id', type: 'integer'),
                        new OA\Property(property: 'fingerprint', type: 'string'),
                    ], type: 'object'),
                ],
                type: 'object',
            ),
        ),
        new OA\Response(response: 422, description: 'Validation error'),
        new OA\Response(response: 429, description: 'Rate limit exceeded'),
    ],
)]
class StoreErrorEventController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(StoreErrorEventRequest $request, ErrorEventService $errorEventService): JsonResponse
    {
        $payload = $request->validated();
        $user = $request->user();
        $payload['user_id'] = $user instanceof User && $user->exists ? $user->getKey() : null;

        $event = $errorEventService->recordFrontend($payload);

        if ($event === null) {
            return $this->sendError(__('messages.error_events.store_failed'), 500);
        }

        return $this->sendSuccess([
            'id' => $event->getKey(),
            'fingerprint' => $event->fingerprint,
        ], 201);
    }
}
