<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FosterReturnHandover extends Model
{
    use HasFactory;

    protected $fillable = [
        'foster_assignment_id',
        'owner_user_id',
        'foster_user_id',
        'scheduled_at',
        'location',
        'status', // pending, confirmed, completed, canceled, disputed
        'foster_initiated_at',
        'owner_confirmed_at',
        'condition_confirmed',
        'condition_notes',
        'completed_at',
        'canceled_at',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'foster_initiated_at' => 'datetime',
        'owner_confirmed_at' => 'datetime',
        'completed_at' => 'datetime',
        'canceled_at' => 'datetime',
        'condition_confirmed' => 'boolean',
    ];

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(FosterAssignment::class, 'foster_assignment_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function fosterer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'foster_user_id');
    }
}
