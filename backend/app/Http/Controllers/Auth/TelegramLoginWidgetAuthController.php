<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\TelegramLoginWidgetAuthService;
use App\Services\TelegramUserAuthService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/auth/telegram/widget',
    summary: 'Authenticate using Telegram Login Widget',
    description: 'Verifies Telegram Login Widget callback data and authenticates or registers a user.',
    tags: ['Authentication'],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['id', 'auth_date', 'hash'],
            properties: [
                new OA\Property(property: 'id', type: 'integer'),
                new OA\Property(property: 'first_name', type: 'string', nullable: true),
                new OA\Property(property: 'last_name', type: 'string', nullable: true),
                new OA\Property(property: 'username', type: 'string', nullable: true),
                new OA\Property(property: 'photo_url', type: 'string', nullable: true),
                new OA\Property(property: 'auth_date', type: 'integer'),
                new OA\Property(property: 'hash', type: 'string'),
                new OA\Property(property: 'invitation_code', type: 'string', nullable: true),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 200, description: 'Authenticated successfully'),
        new OA\Response(response: 403, description: 'Invite-only restriction'),
        new OA\Response(response: 422, description: 'Invalid Telegram auth data'),
    ]
)]
class TelegramLoginWidgetAuthController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(
        Request $request,
        TelegramLoginWidgetAuthService $widgetAuthService,
        TelegramUserAuthService $userAuthService
    ) {
        $validated = $request->validate([
            'id' => ['required', 'integer'],
            'first_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'username' => ['nullable', 'string', 'max:255'],
            'photo_url' => ['nullable', 'string', 'max:2048'],
            'auth_date' => ['required', 'integer'],
            'hash' => ['required', 'string', 'max:255'],
            'invitation_code' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $telegramData = $widgetAuthService->verify($validated);
        } catch (\RuntimeException $e) {
            return $this->sendError($e->getMessage(), 500);
        } catch (\InvalidArgumentException $e) {
            return $this->sendError($e->getMessage(), 422);
        }

        $result = $userAuthService->findOrCreateAndLogin(
            $telegramData,
            $validated['invitation_code'] ?? null,
            $request
        );

        if ($result['invite_only_blocked']) {
            return $this->sendError('Registration is invite-only. Please provide a valid invitation code.', 403);
        }

        $user = $result['user'];
        $created = $result['created'];

        return $this->sendSuccessWithMeta([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            ],
            'created' => $created,
            'linked_telegram' => true,
        ], $created ? 'Telegram account registered and authenticated.' : 'Telegram account authenticated.');
    }
}
