<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\TelegramMiniAppAuthService;
use App\Services\TelegramUserAuthService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use OpenApi\Attributes as OA;

#[OA\Post(
    path: '/api/auth/telegram/miniapp',
    summary: 'Authenticate using Telegram Mini App initData',
    description: 'Verifies Telegram Mini App initData signature and authenticates or registers a user.',
    tags: ['Authentication'],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['init_data'],
            properties: [
                new OA\Property(property: 'init_data', type: 'string'),
                new OA\Property(property: 'invitation_code', type: 'string', nullable: true),
            ]
        )
    ),
    responses: [
        new OA\Response(response: 200, description: 'Authenticated successfully'),
        new OA\Response(response: 403, description: 'Invite-only restriction'),
        new OA\Response(response: 422, description: 'Invalid Telegram auth payload'),
    ]
)]
class TelegramMiniAppAuthController extends Controller
{
    use ApiResponseTrait;

    public function __invoke(
        Request $request,
        TelegramMiniAppAuthService $telegramAuthService,
        TelegramUserAuthService $userAuthService
    ) {
        Log::debug('Telegram miniapp auth: request received', [
            'has_init_data' => $request->has('init_data'),
            'init_data_length' => strlen($request->input('init_data', '')),
            'has_session' => $request->hasSession(),
            'session_id' => $request->hasSession() ? $request->session()->getId() : 'no-session',
        ]);

        $validated = $request->validate([
            'init_data' => ['required', 'string', 'max:8192'],
            'invitation_code' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $telegramData = $telegramAuthService->verify($validated['init_data']);
        } catch (\RuntimeException $e) {
            Log::warning('Telegram miniapp auth: runtime error', ['error' => $e->getMessage()]);

            return $this->sendError($e->getMessage(), 500);
        } catch (\InvalidArgumentException $e) {
            Log::warning('Telegram miniapp auth: validation error', ['error' => $e->getMessage()]);

            return $this->sendError($e->getMessage(), 422);
        }

        Log::debug('Telegram miniapp auth: verified', [
            'telegram_user_id' => $telegramData['telegram_user_id'],
            'telegram_chat_id' => $telegramData['telegram_chat_id'],
        ]);

        $result = $userAuthService->findOrCreateAndLogin(
            $telegramData,
            $validated['invitation_code'] ?? null,
            $request
        );

        if ($result['invite_only_blocked']) {
            Log::info('Telegram miniapp auth: blocked by invite-only');

            return $this->sendError('Registration is invite-only. Please provide a valid invitation code.', 403);
        }

        $user = $result['user'];
        $created = $result['created'];

        Log::info('Telegram miniapp auth: success', [
            'user_id' => $user->id,
            'created' => $created,
            'auth_check' => auth()->check(),
            'session_id' => $request->hasSession() ? $request->session()->getId() : 'no-session',
        ]);

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
