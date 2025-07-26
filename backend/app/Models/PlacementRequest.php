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
    ];

    protected $casts = [
        'request_type' => PlacementRequestType::class,
        'status' => PlacementRequestStatus::class,
        'expires_at' => 'date',
    ];

    public function cat(): BelongsTo
    {
        return $this->belongsTo(Cat::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}