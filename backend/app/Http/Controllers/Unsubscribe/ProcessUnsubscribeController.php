<?php

declare(strict_types=1);

namespace App\Http\Controllers\Unsubscribe;

use App\Enums\UnsubscribeChannel;
use App\Enums\UnsubscribeScope;
use App\Http\Controllers\Controller;
use App\Services\UnsubscribeService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/unsubscribe',
    summary: 'Process an unsubscribe request',
    tags: ['Notifications'],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['user', 'type', 'token'],
            properties: [
                new OA\Property(property: 'user', type: 'integer'),
                new OA\Property(property: 'type', type: 'string'),
                new OA\Property(property: 'token', type: 'string', minLength: 64, maxLength: 64),
                new OA\Property(property: 'channel', type: 'string', enum: ['email', 'in_app', 'telegram'], default: 'email'),
                new OA\Property(property: 'scope', type: 'string', enum: ['all', 'type'], default: 'all'),
            ]
        )
    ),
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
        new OA\Response(
            response: 429,
            description: 'Too many requests'
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
            'token' => ['required', 'string', 'size:64', 'regex:/\A[a-f0-9]{64}\z/i'],
            'channel' => ['sometimes', 'string', Rule::enum(UnsubscribeChannel::class)],
            'scope' => ['sometimes', 'string', Rule::enum(UnsubscribeScope::class)],
        ]);

        $channel = UnsubscribeChannel::tryFrom($request->input('channel', UnsubscribeChannel::EMAIL->value))
            ?? UnsubscribeChannel::EMAIL;
        $scope = UnsubscribeScope::tryFrom($request->input('scope', UnsubscribeScope::ALL->value))
            ?? UnsubscribeScope::ALL;

        $success = $this->unsubscribeService->unsubscribe(
            (int) $request->input('user'),
            $request->input('type'),
            $request->input('token'),
            $channel,
            $scope,
        );

        if ($success) {
            $message = $scope === UnsubscribeScope::ALL
                ? __('messages.unsubscribe.all_email_success')
                : __('messages.unsubscribe.type_success');

            return $this->sendSuccessWithMeta(null, $message);
        }

        return $this->sendError(__('messages.unsubscribe.invalid_request'), 400);
    }
}
