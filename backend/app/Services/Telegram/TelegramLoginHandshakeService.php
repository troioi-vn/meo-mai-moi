<?php

declare(strict_types=1);

namespace App\Services\Telegram;

use App\Models\User;
use App\Services\FrontendPathService;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Support\Str;

class TelegramLoginHandshakeService
{
    private const USER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    private const HANDSHAKE_TTL_SECONDS = 300;

    private const RETURN_TOKEN_TTL_SECONDS = 900;

    public function __construct(
        private readonly CacheRepository $cache,
        private readonly FrontendPathService $frontendPathService,
    ) {}

    /**
     * @return array{nonce: string, user_code: string, expires_in: int}
     */
    public function create(string $sessionId, ?string $locale, mixed $redirectPath): array
    {
        $nonce = Str::random(32);
        $userCode = $this->userCode();

        $this->cache->put($this->handshakeKey($nonce), [
            'status' => 'pending',
            'user_code' => $userCode,
            'session_hash' => hash('sha256', $sessionId),
            'locale' => $this->normalizeLocale($locale),
            'redirect_path' => $this->frontendPathService->sanitize($redirectPath),
        ], now()->addSeconds(self::HANDSHAKE_TTL_SECONDS));

        return [
            'nonce' => $nonce,
            'user_code' => $userCode,
            'expires_in' => self::HANDSHAKE_TTL_SECONDS,
        ];
    }

    public function approve(string $nonce, User $user): bool
    {
        $record = $this->handshakeRecord($nonce);
        if ($record === null || ($record['status'] ?? null) !== 'pending') {
            return false;
        }

        $record['status'] = 'approved';
        $record['user_id'] = $user->id;
        $this->cache->put($this->handshakeKey($nonce), $record, now()->addSeconds(self::HANDSHAKE_TTL_SECONDS));

        return true;
    }

    public function approveForTelegramUser(string $nonce, int $telegramUserId, User $user): bool
    {
        $record = $this->handshakeRecord($nonce);
        if ($record === null || ($record['status'] ?? null) !== 'pending' || ($record['telegram_user_id'] ?? null) !== $telegramUserId) {
            return false;
        }

        return $this->approve($nonce, $user);
    }

    /**
     * Bind a handshake to the Telegram identity that opened its deep link.
     *
     * @return array{locale: ?string, redirect_path: ?string, user_code: string}|null
     */
    public function begin(string $nonce, int $telegramUserId): ?array
    {
        $record = $this->handshakeRecord($nonce);
        if ($record === null || ($record['status'] ?? null) !== 'pending') {
            return null;
        }

        $boundTelegramUserId = $record['telegram_user_id'] ?? null;
        if ($boundTelegramUserId !== null && $boundTelegramUserId !== $telegramUserId) {
            return null;
        }

        $record['telegram_user_id'] = $telegramUserId;
        $this->cache->put($this->handshakeKey($nonce), $record, now()->addSeconds(self::HANDSHAKE_TTL_SECONDS));

        return $this->contextFromRecord($record);
    }

    public function cancel(string $nonce, int $telegramUserId): bool
    {
        $record = $this->handshakeRecord($nonce);
        if ($record === null || ($record['telegram_user_id'] ?? null) !== $telegramUserId) {
            return false;
        }

        $this->cache->forget($this->handshakeKey($nonce));
        $this->cache->put($this->cancelledKey($nonce), [
            'session_hash' => $record['session_hash'],
        ], now()->addSeconds(self::HANDSHAKE_TTL_SECONDS));

        return true;
    }

    /**
     * @return array{status: 'pending'|'approved'|'cancelled'|'expired', user?: User, redirect_path?: ?string}
     */
    public function claim(string $nonce, string $sessionId): array
    {
        $record = $this->handshakeRecord($nonce);
        if ($record === null) {
            return $this->wasCancelledBySession($nonce, $sessionId)
                ? ['status' => 'cancelled']
                : ['status' => 'expired'];
        }

        if (! $this->belongsToSession($record, $sessionId)) {
            return ['status' => 'expired'];
        }

        if (($record['status'] ?? null) !== 'approved') {
            return ['status' => 'pending'];
        }

        $record = $this->cache->pull($this->handshakeKey($nonce));
        if (! is_array($record) || ! $this->belongsToSession($record, $sessionId)) {
            return ['status' => 'expired'];
        }

        $user = User::find($record['user_id'] ?? null);
        if (! $user instanceof User) {
            return ['status' => 'expired'];
        }

        return [
            'status' => 'approved',
            'user' => $user,
            'redirect_path' => $this->frontendPathService->sanitize($record['redirect_path'] ?? null),
        ];
    }

    /**
     * @return array{locale: ?string, redirect_path: ?string, user_code: string}|null
     */
    public function context(string $nonce): ?array
    {
        $record = $this->handshakeRecord($nonce);
        if ($record === null) {
            return null;
        }

        return $this->contextFromRecord($record);
    }

    public function rememberForChat(string $nonce, string $chatId): void
    {
        if ($this->handshakeRecord($nonce) === null) {
            return;
        }

        $this->cache->put($this->chatKey($chatId), $nonce, now()->addSeconds(self::HANDSHAKE_TTL_SECONDS));
    }

    public function nonceForChat(string $chatId): ?string
    {
        $nonce = $this->cache->get($this->chatKey($chatId));

        return is_string($nonce) && $this->handshakeRecord($nonce) !== null ? $nonce : null;
    }

    public function forgetChat(string $chatId): void
    {
        $this->cache->forget($this->chatKey($chatId));
    }

    /**
     * @return array{token: string, expires_in: int}
     */
    public function issueReturnToken(User $user, mixed $redirectPath): array
    {
        $token = Str::random(64);

        $this->cache->put($this->returnTokenKey($token), [
            'user_id' => $user->id,
            'redirect_path' => $this->frontendPathService->sanitize($redirectPath),
        ], now()->addSeconds(self::RETURN_TOKEN_TTL_SECONDS));

        return ['token' => $token, 'expires_in' => self::RETURN_TOKEN_TTL_SECONDS];
    }

    /**
     * @return array{user: User, redirect_path: ?string}|null
     */
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

    /** @param array<string, mixed> $record */
    private function belongsToSession(array $record, string $sessionId): bool
    {
        $expectedHash = $record['session_hash'] ?? null;

        return is_string($expectedHash) && hash_equals($expectedHash, hash('sha256', $sessionId));
    }

    /** @return array<string, mixed>|null */
    private function handshakeRecord(string $nonce): ?array
    {
        if (! preg_match('/^[A-Za-z0-9]{32}$/', $nonce)) {
            return null;
        }

        $record = $this->cache->get($this->handshakeKey($nonce));

        return is_array($record) ? $record : null;
    }

    private function normalizeLocale(mixed $locale): ?string
    {
        if (! is_string($locale)) {
            return null;
        }

        $normalized = strtolower(explode('-', str_replace('_', '-', trim($locale)), 2)[0]);

        return in_array($normalized, ['en', 'ru', 'uk', 'vi'], true) ? $normalized : null;
    }

    /** @return array{locale: ?string, redirect_path: ?string, user_code: string} */
    private function contextFromRecord(array $record): array
    {
        return [
            'locale' => $this->normalizeLocale($record['locale'] ?? null),
            'redirect_path' => $this->frontendPathService->sanitize($record['redirect_path'] ?? null),
            'user_code' => is_string($record['user_code'] ?? null) ? $record['user_code'] : '',
        ];
    }

    private function wasCancelledBySession(string $nonce, string $sessionId): bool
    {
        $cancelled = $this->cache->get($this->cancelledKey($nonce));

        return is_array($cancelled) && $this->belongsToSession($cancelled, $sessionId);
    }

    private function userCode(): string
    {
        $code = '';
        $lastIndex = strlen(self::USER_CODE_ALPHABET) - 1;

        for ($position = 0; $position < 4; $position++) {
            $code .= self::USER_CODE_ALPHABET[random_int(0, $lastIndex)];
        }

        return $code;
    }

    private function handshakeKey(string $nonce): string
    {
        return "telegram-handshake:{$nonce}";
    }

    private function chatKey(string $chatId): string
    {
        return "telegram-handshake-chat:{$chatId}";
    }

    private function cancelledKey(string $nonce): string
    {
        return "telegram-handshake-cancelled:{$nonce}";
    }

    private function returnTokenKey(string $token): string
    {
        return 'telegram-login-return:'.hash('sha256', $token);
    }
}
