<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FosterAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'cat_id',
        'owner_user_id',
        'foster_user_id',
        'transfer_request_id',
        'start_date',
        'expected_end_date',
        'completed_at',
        'canceled_at',
        'status',
    ];

    protected $casts = [
        'start_date' => 'date',
        'expected_end_date' => 'date',
        'completed_at' => 'datetime',
        'canceled_at' => 'datetime',
    ];

    public function cat(): BelongsTo
    {
        return $this->belongsTo(Cat::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function fosterer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'foster_user_id');
    }

    public function transferRequest(): BelongsTo
    {
        return $this->belongsTo(TransferRequest::class);
    }
}
