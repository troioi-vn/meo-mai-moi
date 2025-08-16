<?php

namespace App\Models;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlacementRequest extends Model
{
    // ...existing code...
    use HasFactory;

    protected $fillable = [
        'cat_id',
        'user_id',
        'request_type',
        'status',
        'notes',
        'expires_at',
        'start_date',
        'end_date',
        'is_active',
    ];

    protected $casts = [
        'request_type' => PlacementRequestType::class,
        'status' => PlacementRequestStatus::class,
        'expires_at' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function cat(): BelongsTo
    {
        return $this->belongsTo(Cat::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transferRequests()
    {
        return $this->hasMany(TransferRequest::class);
    }

    /**
     * Get the response count attribute for admin display
     */
    public function getResponseCountAttribute(): int
    {
        return $this->transferRequests()->count();
    }
}