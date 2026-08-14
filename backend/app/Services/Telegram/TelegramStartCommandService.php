<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Models\User;
use App\Services\TelegramUserAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;

class TelegramStartCommandService
{
    public function __construct(
        private readonly TelegramLoginLinkService $loginLinkService,
        private readonly TelegramLoginRedirectService $redirectService,
        private readonly TelegramLocaleService $localeService,
        private readonly TelegramIdentityService $identityService,
        private readonly TelegramAccountFlowService $accountFlowService,
        private readonly TelegramBotApiService $botApi,
        private readonly TelegramUserAuthService $userAuthService,
    ) {}

    /** @param array<string, mixed> $message */
    public function handle(string $text, string $chatId, array $message): void
    {
        $parts = explode(' ', $text, 2);
        $param = $parts[1] ?? null;

        // Only a non-empty, non-login payload can be a settings link token. Querying with a
        // null payload would compile to `whereNull`, letting a bare /start claim any account
        // whose link token happens to be null.
        if (is_string($param) && $param !== '' && ! $this->isLoginContext($param)) {
            $user = User::where('telegram_link_token', $param)
                ->where('telegram_link_token_expires_at', '>', now())
                ->first();

            if ($user instanceof User) {
                $this->handleSettingsLink($user, $chatId, $message);

                return;
            }

            $locale = $this->localeService->resolve($chatId);
            $this->botApi->sendMessage($chatId, $this->localeService->trans('invalid_token', [
                'url' => config('app.url', 'https://meomaimoi.com'),
            ], $locale));

            return;
        }

        $this->handleLoginStart($param, $chatId, $message);
    }

    /** @param array<string, mixed> $message */
    private function handleLoginStart(?string $param, string $chatId, array $message): void
    {
        $telegramFrom = $message['from'] ?? null;
        if (! is_array($telegramFrom) || ! isset($telegramFrom['id'])) {
            $locale = $this->localeService->resolve($chatId);
            $this->botApi->sendMessage($chatId, $this->localeService->trans('identify_error', [], $locale));

            return;
        }

        $context = $this->contextFor($param);
        if ($context === false) {
            $locale = $this->localeService->resolve($chatId, null, null, $telegramFrom['language_code'] ?? null);
            $this->botApi->sendMessage($chatId, $this->localeService->trans('invalid_login_handshake', [], $locale));

            return;
        }

        $locale = $this->localeService->resolve(
            $chatId,
            $this->identityService->findUser((int) $telegramFrom['id'], $chatId),
            $context['locale'],
            $telegramFrom['language_code'] ?? null,
        );
        $redirectPath = $context['redirect_path'];
        $telegramData = $this->identityService->dataFromMessageUser($telegramFrom);
        $telegramData['telegram_chat_id'] = $chatId;
        $result = $this->userAuthService->findOrCreateAndLogin(
            $telegramData,
            $context['invitation_code'],
            new Request,
            $locale,
        );

        if ($result['invite_only_blocked']) {
            $this->botApi->sendMessage($chatId, $this->localeService->trans('invite_only', [], $locale));

            return;
        }

        $user = $result['user'];
        $this->identityService->unlinkFromOtherUsers($user, $chatId, (int) $telegramFrom['id']);
        $user->update(['telegram_chat_id' => $chatId]);
        $this->identityService->enableNotifications($user);

        $this->accountFlowService->sendLoginOptions(
            $chatId,
            $user,
            $locale,
            $redirectPath,
            $result['created'] ? 'welcome_created' : 'welcome_back',
        );
    }

    /** @return array{locale: ?string, redirect_path: ?string, invitation_code: ?string}|false */
    private function contextFor(?string $param): array|false
    {
        if (is_string($param) && preg_match('/^hs_([A-Za-z0-9]{32})$/', $param, $matches) === 1) {
            return $this->loginLinkService->context($matches[1]) ?? false;
        }

        return [
            'locale' => null,
            'redirect_path' => $this->redirectService->resolve($param),
            'invitation_code' => null,
        ];
    }

    private function isLoginContext(string $param): bool
    {
        return $param === 'login'
            || str_starts_with($param, 'login_')
            || preg_match('/^hs_[A-Za-z0-9]{32}$/', $param) === 1;
    }

    /** @param array<string, mixed> $message */
    private function handleSettingsLink(User $user, string $chatId, array $message): void
    {
        $telegramFrom = $message['from'] ?? null;
        $telegramUserId = is_array($telegramFrom) && isset($telegramFrom['id']) ? (int) $telegramFrom['id'] : null;
        $this->identityService->unlinkFromOtherUsers($user, $chatId, $telegramUserId);

        $updates = [
            'telegram_chat_id' => $chatId,
            'telegram_link_token' => null,
            'telegram_link_token_expires_at' => null,
        ];
        if ($telegramUserId !== null && is_array($telegramFrom)) {
            $updates += Arr::only($this->identityService->dataFromMessageUser($telegramFrom), [
                'telegram_user_id',
                'telegram_username',
                'telegram_first_name',
                'telegram_last_name',
                'telegram_photo_url',
            ]);
            $updates['telegram_last_authenticated_at'] = now();
        }
        $user->update($updates);
        $this->identityService->enableNotifications($user);

        Log::info('Telegram linked to user', ['user_id' => $user->id, 'chat_id' => $chatId]);
        $locale = $this->localeService->resolve($chatId, $user);
        $this->accountFlowService->sendLoginOptions($chatId, $user, $locale, null, 'linked');
    }
}
