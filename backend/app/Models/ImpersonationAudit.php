<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ImpersonationAuditFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per handoff token, carrying it from mint to outcome.
 *
 * Statuses move issued -> consumed -> left on the happy path, and issued ->
 * expired / rejected otherwise. A replayed token does not move an already
 * consumed row; the successful impersonation it records is the more useful fact.
 */
class ImpersonationAudit extends Model
{
    /** @use HasFactory<ImpersonationAuditFactory> */
    use HasFactory;

    public const STATUS_ISSUED = 'issued';

    public const STATUS_CONSUMED = 'consumed';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_LEFT = 'left';

    protected $fillable = [
        'impersonator_user_id',
        'target_user_id',
        'token_hash',
        'status',
        'source',
        'guard',
        'impersonator_name',
        'impersonator_email',
        'target_name',
        'target_email',
        'back_to',
        'issued_ip',
        'consumed_ip',
        'rejection_reason',
        'expires_at',
        'consumed_at',
        'left_at',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'expires_at' => 'datetime',
        'consumed_at' => 'datetime',
        'left_at' => 'datetime',
    ];

    /** @return BelongsTo<User, $this> */
    public function impersonator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'impersonator_user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function target(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }
}
