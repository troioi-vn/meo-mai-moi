<?php

declare(strict_types=1);

namespace App\Services\Impersonation;

use App\Exceptions\ImpersonationHandoffException;
use App\Models\ImpersonationAudit;
use App\Models\User;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Carries an impersonation across the admin/app domain boundary.
 *
 * The admin panel answers on an internal hostname and the app on the public
 * one, which are different registrable domains, so the session cookie the
 * package would normally hand over cannot travel. This mints an opaque
 * single-use token instead: the admin container writes it to the shared cache,
 * the public container trades it for a session it owns.
 *
 * Both capability checks are re-run at consume time rather than trusted from
 * the mint, because the token outlives the click that produced it.
 */
class ImpersonationHandoffService
{
    public function __construct(
        private readonly CacheRepository $cache,
    ) {}

    /**
     * Mint a handoff token for one impersonator/target pair.
     *
     * @return array{token: string, expires_at: Carbon, audit: ImpersonationAudit}
     */
    public function issue(
        User $impersonator,
        User $target,
        string $backTo,
        string $guard = 'web',
        ?string $issuedIp = null,
    ): array {
        $token = Str::random(64);
        $expiresAt = now()->addSeconds($this->ttlSeconds());

        $this->cache->put(
            $this->cacheKey($token),
            [
                'impersonator_id' => $impersonator->getAuthIdentifier(),
                'target_id' => $target->getAuthIdentifier(),
                'guard' => $guard,
                'back_to' => $backTo,
            ],
            $expiresAt,
        );

        $audit = ImpersonationAudit::query()->create([
            'impersonator_user_id' => $impersonator->id,
            'target_user_id' => $target->id,
            'token_hash' => $this->tokenHash($token),
            'status' => ImpersonationAudit::STATUS_ISSUED,
            'source' => 'admin_panel',
            'guard' => $guard,
            'impersonator_name' => $impersonator->name,
            'impersonator_email' => $impersonator->email,
            'target_name' => $target->name,
            'target_email' => $target->email,
            'back_to' => $backTo,
            'issued_ip' => $issuedIp,
            'expires_at' => $expiresAt,
            'metadata' => [],
        ]);

        return [
            'token' => $token,
            'expires_at' => $expiresAt,
            'audit' => $audit,
        ];
    }

    /**
     * Spend a handoff token, or explain why it cannot be spent.
     *
     * @return array{impersonator: User, target: User, guard: string, back_to: string, audit: ImpersonationAudit}
     *
     * @throws ImpersonationHandoffException
     */
    public function consume(string $token, ?string $consumedIp = null): array
    {
        $audit = $token === ''
            ? null
            : ImpersonationAudit::query()->where('token_hash', $this->tokenHash($token))->first();

        /** @var array{impersonator_id: int|string, target_id: int|string, guard: string, back_to: string}|null $payload */
        $payload = $token === '' ? null : $this->cache->pull($this->cacheKey($token));

        if ($payload === null) {
            throw $this->explainMissingPayload($audit);
        }

        $impersonator = User::query()->find($payload['impersonator_id']);
        $target = User::query()->find($payload['target_id']);

        if (! $impersonator instanceof User || ! $impersonator->canImpersonate()) {
            $this->reject($audit, 'impersonator_not_allowed');

            throw ImpersonationHandoffException::impersonatorNotAllowed();
        }

        if (! $target instanceof User || ! $target->canBeImpersonated()) {
            $this->reject($audit, 'target_not_allowed');

            throw ImpersonationHandoffException::targetNotAllowed();
        }

        $audit?->forceFill([
            'status' => ImpersonationAudit::STATUS_CONSUMED,
            'consumed_at' => now(),
            'consumed_ip' => $consumedIp,
        ])->save();

        return [
            'impersonator' => $impersonator,
            'target' => $target,
            'guard' => $payload['guard'],
            'back_to' => $payload['back_to'],
            'audit' => $audit,
        ];
    }

    /**
     * Close out an audit row when the operator stops impersonating.
     */
    public function markLeft(?int $auditId): void
    {
        if ($auditId === null) {
            return;
        }

        ImpersonationAudit::query()
            ->whereKey($auditId)
            ->where('status', ImpersonationAudit::STATUS_CONSUMED)
            ->update([
                'status' => ImpersonationAudit::STATUS_LEFT,
                'left_at' => now(),
                'updated_at' => now(),
            ]);
    }

    public function ttlSeconds(): int
    {
        return max(1, (int) config('impersonation.handoff_token_ttl_seconds', 60));
    }

    /**
     * The cache entry is gone. Say why, and record it where it is attributable.
     */
    private function explainMissingPayload(?ImpersonationAudit $audit): ImpersonationHandoffException
    {
        if (! $audit instanceof ImpersonationAudit) {
            return ImpersonationHandoffException::unknownToken();
        }

        // A spent token is a replay. Leave the row on `consumed`: the successful
        // impersonation it records is the more useful fact than this attempt.
        if (in_array($audit->status, [ImpersonationAudit::STATUS_CONSUMED, ImpersonationAudit::STATUS_LEFT], true)) {
            return ImpersonationHandoffException::replayedToken();
        }

        if ($audit->status === ImpersonationAudit::STATUS_ISSUED) {
            $audit->forceFill([
                'status' => ImpersonationAudit::STATUS_EXPIRED,
                'rejection_reason' => 'expired_token',
            ])->save();
        }

        return ImpersonationHandoffException::expiredToken();
    }

    private function reject(?ImpersonationAudit $audit, string $reason): void
    {
        $audit?->forceFill([
            'status' => ImpersonationAudit::STATUS_REJECTED,
            'rejection_reason' => $reason,
        ])->save();
    }

    private function tokenHash(string $token): string
    {
        return hash('sha256', $token);
    }

    private function cacheKey(string $token): string
    {
        return 'impersonation-handoff:'.$this->tokenHash($token);
    }
}
