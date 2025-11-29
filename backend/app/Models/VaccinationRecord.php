<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VaccinationRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'pet_id',
        'vaccine_name',
        'administered_at',
        'due_at',
        'notes',
        'reminder_sent_at',
        'completed_at',
    ];

    protected $casts = [
        'administered_at' => 'date',
        'due_at' => 'date',
        'reminder_sent_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    /**
     * Scope to only active (non-completed) vaccination records.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('completed_at');
    }

    /**
     * Scope to only completed vaccination records.
     */
    public function scopeCompleted(Builder $query): Builder
    {
        return $query->whereNotNull('completed_at');
    }

    /**
     * Check if this vaccination record is active (not completed).
     */
    public function isActive(): bool
    {
        return $this->completed_at === null;
    }

    /**
     * Check if this vaccination record is completed.
     */
    public function isCompleted(): bool
    {
        return $this->completed_at !== null;
    }

    /**
     * Mark this vaccination record as completed.
     */
    public function markAsCompleted(): void
    {
        $this->completed_at = now();
        $this->save();
    }
}
