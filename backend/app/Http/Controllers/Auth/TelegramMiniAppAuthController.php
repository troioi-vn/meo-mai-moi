<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Settings;
use App\Models\User;
use App\Services\InvitationService;
use App\Services\TelegramMiniAppAuthService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
        InvitationService $invitationService
    ) {
        $validated = $request->validate([
            'init_data' => ['required', 'string', 'max:8192'],
            'invitation_code' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $telegramData = $telegramAuthService->verify($validated['init_data']);
        } catch (\RuntimeException $e) {
            return $this->sendError($e->getMessage(), 500);
        } catch (\InvalidArgumentException $e) {
            return $this->sendError($e->getMessage(), 422);
        }

        $user = User::where('telegram_user_id', $telegramData['telegram_user_id'])->first();
        $created = false;

        if (! $user) {
            $inviteOnlyEnabled = filter_var(Settings::get('invite_only_enabled', false), FILTER_VALIDATE_BOOLEAN);
            $invitationCode = $validated['invitation_code'] ?? null;
            $isValidInvitation = is_string($invitationCode)
                && $invitationCode !== ''
                && $invitationService->validateInvitationCode($invitationCode) !== null;

            if ($inviteOnlyEnabled && ! $isValidInvitation) {
                return $this->sendError('Registration is invite-only. Please provide a valid invitation code.', 403);
            }

            $user = User::create([
                'name' => $this->buildDisplayName($telegramData),
                'email' => $this->buildTelegramEmail($telegramData['telegram_user_id']),
                'password' => null,
                'telegram_user_id' => $telegramData['telegram_user_id'],
                'telegram_username' => $telegramData['telegram_username'],
                'telegram_first_name' => $telegramData['telegram_first_name'],
                'telegram_last_name' => $telegramData['telegram_last_name'],
                'telegram_photo_url' => $telegramData['telegram_photo_url'],
                'telegram_last_authenticated_at' => now(),
            ]);
            $user->forceFill(['email_verified_at' => now()])->save();
            $created = true;

            if ($isValidInvitation) {
                $invitationService->acceptInvitation($invitationCode, $user);
            }
        } else {
            $user->update([
                'telegram_username' => $telegramData['telegram_username'],
                'telegram_first_name' => $telegramData['telegram_first_name'],
                'telegram_last_name' => $telegramData['telegram_last_name'],
                'telegram_photo_url' => $telegramData['telegram_photo_url'],
                'telegram_last_authenticated_at' => now(),
            ]);
        }

        if ($request->hasSession()) {
            Auth::login($user, true);
            $request->session()->regenerate();
        }

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

    /**
     * @param array{
     *   telegram_user_id:int,
     *   telegram_username:?string,
     *   telegram_first_name:?string,
     *   telegram_last_name:?string,
     *   telegram_photo_url:?string,
     *   auth_date:int,
     *   query_id:?string
     * } $telegramData
     */
    private function buildDisplayName(array $telegramData): string
    {
        $parts = array_values(array_filter([
            $telegramData['telegram_first_name'],
            $telegramData['telegram_last_name'],
        ]));

        if ($parts !== []) {
            return implode(' ', $parts);
        }

        if (is_string($telegramData['telegram_username']) && $telegramData['telegram_username'] !== '') {
            return '@'.$telegramData['telegram_username'];
        }

        return 'Telegram User '.$telegramData['telegram_user_id'];
    }

    private function buildTelegramEmail(int $telegramUserId): string
    {
        return sprintf('telegram_%d@telegram.meo-mai-moi.local', $telegramUserId);
    }
}
