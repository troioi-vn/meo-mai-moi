<?php

declare(strict_types=1);

namespace App\Http\Controllers\Unsubscribe;

use App\Http\Controllers\Controller;
use App\Services\UnsubscribeService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/unsubscribe/process',
    summary: 'Process an unsubscribe request',
    tags: ['Notifications'],
    parameters: [
        new OA\Parameter(name: 'user', in: 'query', required: true, schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'type', in: 'query', required: true, schema: new OA\Schema(type: 'string')),
        new OA\Parameter(name: 'token', in: 'query', required: true, schema: new OA\Schema(type: 'string')),
    ],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Unsubscribed successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/ApiSuccessMessageResponse')
        ),
        new OA\Response(
            response: 400,
            description: 'Invalid or expired token',
            content: new OA\JsonContent(ref: '#/components/schemas/ApiErrorMessageResponse')
        ),
    ]
)]
class ProcessUnsubscribeController extends Controller
{
    use ApiResponseTrait;

    public function __construct(
        protected UnsubscribeService $unsubscribeService
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'user' => 'required|integer',
            'type' => 'required|string',
            'token' => 'required|string',
        ]);

        $success = $this->unsubscribeService->unsubscribe(
            (int) $request->input('user'),
            $request->input('type'),
            $request->input('token')
        );

        if ($success) {
            return $this->sendSuccessWithMeta(null, 'You have been successfully unsubscribed from this notification type.');
        }

        return $this->sendError(__('messages.unsubscribe.invalid_request'), 400);
    }
}
