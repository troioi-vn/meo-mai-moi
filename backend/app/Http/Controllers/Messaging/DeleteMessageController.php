<?php

declare(strict_types=1);

namespace App\Http\Controllers\Messaging;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Services\ChatMessageModerationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class DeleteMessageController extends Controller
{
    use ApiResponseTrait;

    #[OA\Delete(
        path: '/api/msg/messages/{id}',
        summary: 'Delete a message',
        tags: ['Messaging'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(response: 204, description: 'Success'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 403, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Message not found'),
        ]
    )]
    public function __invoke(
        Request $request,
        ChatMessage $message,
        ChatMessageModerationService $moderationService
    ): JsonResponse {
        $this->authorize('delete', $message);

        $moderationService->softDelete($message);

        return $this->sendSuccess(['message' => 'Message deleted successfully.']);
    }
}
