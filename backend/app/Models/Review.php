<?php

namespace App\Models;

use App\Enums\ReviewStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

// ...existing code...
class Review extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'reviewer_user_id',
        'reviewed_user_id',
        'rating',
        'comment',
        'transfer_id',
        'status',
        'moderation_notes',
        'is_flagged',
        'flagged_at',
        'moderated_by',
        'moderated_at',
    ];

    protected $casts = [
        'is_flagged' => 'boolean',
        'flagged_at' => 'datetime',
        'moderated_at' => 'datetime',
        'status' => ReviewStatus::class,
    ];

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_user_id');
    }

    public function reviewed(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_user_id');
    }

    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderated_by');
    }

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(TransferRequest::class, 'transfer_id');
    }
}
