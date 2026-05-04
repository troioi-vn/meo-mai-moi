<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ApiTokenRevocationAuditFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiTokenRevocationAudit extends Model
{
    /** @use HasFactory<ApiTokenRevocationAuditFactory> */
    use HasFactory;

    protected $fillable = [
        'actor_user_id',
        'target_user_id',
        'token_id',
        'token_name',
        'tokenable_type',
        'tokenable_id',
        'token_abilities',
        'token_last_used_at',
        'source',
        'actor_name',
        'actor_email',
        'target_name',
        'target_email',
        'metadata',
    ];

    protected $casts = [
        'token_abilities' => 'array',
        'metadata' => 'array',
        'token_last_used_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function target(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }
}
