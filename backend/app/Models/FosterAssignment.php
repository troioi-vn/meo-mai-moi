<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class FosterAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'pet_id', // Updated from cat_id
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

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    // Legacy cat() relation removed after Pet-only migration.

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

    public function fosterReturnHandover(): HasOne
    {
        return $this->hasOne(FosterReturnHandover::class);
    }

    // Computed attributes for admin display
    public function getDurationInDaysAttribute(): ?int
    {
        if (! $this->start_date) {
            return null;
        }

        $endDate = $this->completed_at ?? $this->canceled_at ?? now();

        return $this->start_date->diffInDays($endDate);
    }

    public function getDaysRemainingAttribute(): ?int
    {
        if ($this->status !== 'active' || ! $this->expected_end_date) {
            return null;
        }

        return now()->diffInDays($this->expected_end_date, false);
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->status === 'active'
            && $this->expected_end_date
            && now()->isAfter($this->expected_end_date);
    }

    // Scopes for filtering
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'active')
            ->whereNotNull('expected_end_date')
            ->whereDate('expected_end_date', '<', now());
    }

    public function scopeEndingSoon($query, $days = 7)
    {
        return $query->where('status', 'active')
            ->whereNotNull('expected_end_date')
            ->whereDate('expected_end_date', '<=', now()->addDays($days))
            ->whereDate('expected_end_date', '>=', now());
    }
}
