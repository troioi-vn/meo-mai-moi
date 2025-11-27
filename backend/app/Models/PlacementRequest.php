<?php

namespace App\Models;

use App\Enums\PlacementRequestStatus;
use App\Enums\PlacementRequestType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @OA\Schema(
 *     schema="PlacementRequest",
 *     type="object",
 *     title="PlacementRequest",
 *     required={"id", "pet_id", "user_id", "request_type", "status"},
 *
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="pet_id", type="integer", example=2),
 *     @OA\Property(property="user_id", type="integer", example=5),
 *     @OA\Property(property="request_type", type="string", example="adoption"),
 *     @OA\Property(property="status", type="string", example="pending"),
 *     @OA\Property(property="notes", type="string", example="Looking for a loving home."),
 *     @OA\Property(property="expires_at", type="string", format="date", example="2025-08-01"),
 *     @OA\Property(property="start_date", type="string", format="date", example="2025-08-05"),
 *     @OA\Property(property="end_date", type="string", format="date", example="2025-08-20")
 * )
 */
class PlacementRequest extends Model
{
    // ...existing code...
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'pet_id', // Updated from cat_id
        'user_id',
        'request_type',
        'status',
        'notes',
        'expires_at',
        'start_date',
        'end_date',
        // Backward-compatibility bridge
        'is_active',
    ];

    protected $casts = [
        'request_type' => PlacementRequestType::class,
        'status' => PlacementRequestStatus::class,
        'expires_at' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    // Legacy cat() relation removed after Pet-only migration.

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

    /**
     * Check if the placement request is active (open).
     */
    public function isActive(): bool
    {
        return $this->status === PlacementRequestStatus::OPEN;
    }

    /**
     * Virtual accessor for `is_active` legacy boolean.
     */
    public function getIsActiveAttribute(): bool
    {
        return $this->isActive();
    }

    /**
     * Virtual mutator for `is_active` mapping to OPEN/CANCELLED (or leave as-is if false but not open).
     */
    public function setIsActiveAttribute($value): void
    {
        $bool = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($bool === null) {
            $bool = ! empty($value);
        }
        $this->attributes['status'] = $bool
            ? PlacementRequestStatus::OPEN->value
            : ($this->status === PlacementRequestStatus::FULFILLED
                ? PlacementRequestStatus::FULFILLED->value
                : PlacementRequestStatus::CANCELLED->value);
    }

    /**
     * Mark the placement request as fulfilled.
     */
    public function markAsFulfilled(): void
    {
        $this->update(['status' => PlacementRequestStatus::FULFILLED]);
    }

    /**
     * Mark the placement request as cancelled.
     */
    public function markAsCancelled(): void
    {
        $this->update(['status' => PlacementRequestStatus::CANCELLED]);
    }

    /**
     * Scope for active (open) placement requests.
     */
    public function scopeActive($query)
    {
        return $query->where('status', PlacementRequestStatus::OPEN);
    }
}
