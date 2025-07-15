<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'cat_id',
        'initiator_user_id',
        'recipient_user_id',
        'status',
        'requested_relationship_type',
        'fostering_type',
        'price',
        'accepted_at',
        'rejected_at',
    ];

    protected $casts = [
        'accepted_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    public function cat(): BelongsTo
    {
        return $this->belongsTo(Cat::class);
    }

    public function initiator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiator_user_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }
}
