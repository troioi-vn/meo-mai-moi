<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Models\User;
use App\Services\FrontendPathService;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Support\Str;

class TelegramLoginLinkService
{
    private const CONTEXT_TTL_SECONDS = 300;

    private const RETURN_TOKEN_TTL_SECONDS = 300;

    /**
     * A handoff moves an already-signed-in session between browsers, so the user is holding
     * the device and acting now. It does not need the slack a chat message does.
     */
    public const HANDOFF_TOKEN_TTL_SECONDS = 60;

    public function __construct(
        private readonly CacheRepository $cache,
        private readonly FrontendPathService $frontendPathService,
    ) {}

    /** @return array{nonce: string, expires_in: int} */
    public function create(?string $locale, mixed $redirectPath, ?string $invitationCode): array
    {
        $nonce = Str::random(32);

        $this->cache->put($this->contextKey($nonce), [
            'locale' => $this->normalizeLocale($locale),
            'redirect_path' => $this->frontendPathService->sanitize($redirectPath),
            'invitation_code' => $this->normalizeInvitationCode($invitationCode),
        ], now()->addSeconds(self::CONTEXT_TTL_SECONDS));

        return ['nonce' => $nonce, 'expires_in' => self::CONTEXT_TTL_SECONDS];
    }

    /** @return array{locale: ?string, redirect_path: ?string, invitation_code: ?string}|null */
    public function context(string $nonce): ?array
    {
        if (! preg_match('/^[A-Za-z0-9]{32}$/', $nonce)) {
            return null;
        }

        $record = $this->cache->get($this->contextKey($nonce));
        if (! is_array($record)) {
            return null;
        }

        return [
            'locale' => $this->normalizeLocale($record['locale'] ?? null),
            'redirect_path' => $this->frontendPathService->sanitize($record['redirect_path'] ?? null),
            'invitation_code' => $this->normalizeInvitationCode($record['invitation_code'] ?? null),
        ];
    }

    /** @return array{token: string, expires_in: int} */
    public function issueReturnToken(User $user, mixed $redirectPath, ?int $ttlSeconds = null): array
    {
        $token = Str::random(64);
        $ttlSeconds ??= self::RETURN_TOKEN_TTL_SECONDS;

        $this->cache->put($this->returnTokenKey($token), [
            'user_id' => $user->id,
            'redirect_path' => $this->frontendPathService->sanitize($redirectPath),
        ], now()->addSeconds($ttlSeconds));

        return ['token' => $token, 'expires_in' => $ttlSeconds];
    }

    /**
     * The absolute URL that consumes a return token. Shared by the bot's login button and by
     * the handoff endpoint, so a session lands the same way whichever minted the token.
     */
    public function returnUrl(string $token): string
    {
        return rtrim((string) config('app.url', 'https://meomaimoi.com'), '/')
            .'/auth/telegram/return?'.http_build_query(['token' => $token]);
    }

    /** @return array{user: User, redirect_path: ?string}|null */
    public function consumeReturnToken(string $token): ?array
    {
        if ($token === '') {
            return null;
        }

        $record = $this->cache->pull($this->returnTokenKey($token));
        if (! is_array($record)) {
            return null;
        }

        $user = User::find($record['user_id'] ?? null);
        if (! $user instanceof User) {
            return null;
        }

        return [
            'user' => $user,
            'redirect_path' => $this->frontendPathService->sanitize($record['redirect_path'] ?? null),
        ];
    }

    private function normalizeLocale(mixed $locale): ?string
    {
        if (! is_string($locale)) {
            return null;
        }

        $normalized = strtolower(explode('-', str_replace('_', '-', trim($locale)), 2)[0]);

        return in_array($normalized, ['en', 'ru', 'uk', 'vi'], true) ? $normalized : null;
    }

    private function normalizeInvitationCode(mixed $invitationCode): ?string
    {
        if (! is_string($invitationCode)) {
            return null;
        }

        $invitationCode = trim($invitationCode);

        return $invitationCode === '' ? null : $invitationCode;
    }

    private function contextKey(string $nonce): string
    {
        return "telegram-login-context:{$nonce}";
    }

    private function returnTokenKey(string $token): string
    {
        return 'telegram-login-return:'.hash('sha256', $token);
    }
}
