<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\PushSubscriptionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushSubscription extends Model
{
    public const STALE_AFTER_DAYS = 90;

    /** @use HasFactory<PushSubscriptionFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'endpoint_hash',
        'endpoint',
        'p256dh',
        'auth',
        'content_encoding',
        'expires_at',
        'last_seen_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function hashEndpoint(string $endpoint): string
    {
        return hash('sha256', $endpoint);
    }

    public function isExpired(?CarbonInterface $now = null): bool
    {
        return $this->expires_at !== null
            && $this->expires_at->isPast($now ?? now());
    }

    public function isStale(?CarbonInterface $now = null): bool
    {
        $now ??= now();

        return $this->isExpired($now)
            || $this->last_seen_at === null
            || $this->last_seen_at->lt($now->copy()->subDays(self::STALE_AFTER_DAYS));
    }

    public function removeIfStale(?CarbonInterface $now = null): bool
    {
        if (! $this->isStale($now)) {
            return false;
        }

        return (bool) $this->delete();
    }

    public function getHealthStatusAttribute(): string
    {
        if ($this->isExpired()) {
            return 'expired';
        }

        if ($this->isStale()) {
            return 'stale';
        }

        return 'healthy';
    }

    public function getMaskedEndpointAttribute(): string
    {
        $host = parse_url($this->endpoint, PHP_URL_HOST);

        return is_string($host) && $host !== ''
            ? 'https://'.$host.'/…'.substr($this->endpoint_hash, -8)
            : '••••'.substr($this->endpoint_hash, -8);
    }

    public function getMaskedP256dhAttribute(): string
    {
        return self::maskSecret($this->p256dh);
    }

    public function getMaskedAuthAttribute(): string
    {
        return self::maskSecret($this->auth);
    }

    private static function maskSecret(?string $value): string
    {
        if ($value === null || $value === '') {
            return 'Not set';
        }

        return '••••'.substr($value, -6);
    }
}
