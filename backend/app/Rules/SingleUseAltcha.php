<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use GrantHolle\Altcha\Rules\ValidAltcha;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Cache;

/**
 * Altcha with the replay hole closed.
 *
 * The package's own rule is `verifySolution()` and nothing else, and the
 * upstream library's verifySolution is a pure HMAC-and-hash check plus an
 * expiry read out of the salt. Neither remembers that a solution was already
 * spent, so one solved challenge can be posted over and over until it lapses.
 *
 * A challenge's signature is derived from its random salt, so it identifies one
 * challenge exactly. Burning it on first use makes a solution worth one write.
 */
class SingleUseAltcha implements ValidationRule
{
    private const CACHE_PREFIX = 'altcha:spent:';

    public function __construct(
        private readonly ValidAltcha $inner = new ValidAltcha,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $failed = false;

        // Matches ValidAltcha's expected $fail signature rather than our own,
        // so the inner rule can report through us unchanged.
        $this->inner->validate($attribute, $value, function (string $message) use ($fail, &$failed) {
            $failed = true;

            return $fail($message);
        });

        if ($failed) {
            return;
        }

        // The test bypass is a fixed string rather than a real solution, so it
        // has no signature to burn and must stay reusable across a test's
        // several requests.
        $bypass = config('altcha.testing_bypass');
        if (app()->environment('testing') && $bypass && $bypass === $value) {
            return;
        }

        $signature = $this->signatureOf($value);

        if ($signature === null) {
            $fail(__('validation.custom.altcha.malformed'));

            return;
        }

        $key = self::CACHE_PREFIX.hash('sha256', $signature);

        // add() is atomic, so two requests racing the same solution cannot both
        // win. TTL outlives the challenge's own expiry so the burn cannot lapse
        // before the solution does.
        $ttl = max(60, ((int) config('altcha.expires', 10)) * 6);

        if (! Cache::add($key, true, $ttl)) {
            $fail(__('validation.custom.altcha.replayed'));
        }
    }

    private function signatureOf(mixed $value): ?string
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        $decoded = base64_decode($value, true);

        if ($decoded === false) {
            return null;
        }

        $payload = json_decode($decoded, true);

        if (! is_array($payload) || ! isset($payload['signature']) || ! is_string($payload['signature'])) {
            return null;
        }

        return $payload['signature'];
    }
}
