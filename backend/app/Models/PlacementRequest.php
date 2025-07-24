<?php

namespace App\Models;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlacementRequest extends Model
{
    /**
     * @OA\Schema(
     *     schema="PlacementRequest",
     *     type="object",
     *     title="PlacementRequest",
     *     required={"id", "cat_id", "user_id", "request_type", "status"},
     *     @OA\Property(property="id", type="integer", example=1),
     *     @OA\Property(property="cat_id", type="integer", example=2),
     *     @OA\Property(property="user_id", type="integer", example=5),
     *     @OA\Property(property="request_type", type="string", example="adoption"),
     *     @OA\Property(property="status", type="string", example="pending"),
     *     @OA\Property(property="notes", type="string", example="Looking for a loving home."),
     *     @OA\Property(property="expires_at", type="string", format="date-time", example="2025-08-01T00:00:00Z")
     * )
     */
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
        'expires_at' => 'datetime',
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