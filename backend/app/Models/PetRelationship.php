<?php

namespace App\Models;

use App\Enums\PetRelationshipType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PetRelationship extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'pet_id',
        'relationship_type',
        'start_at',
        'end_at',
        'created_by',
    ];

    protected $casts = [
        'relationship_type' => PetRelationshipType::class,
        'start_at' => 'datetime',
        'end_at' => 'datetime',
    ];

    /**
     * Get the user in this relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the pet in this relationship
     */
    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    /**
     * Get the user who created this relationship
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope to get active relationships (no end date)
     */
    public function scopeActive($query)
    {
        return $query->whereNull('end_at');
    }

    /**
     * Scope to get relationships by type
     */
    public function scopeOfType($query, PetRelationshipType $type)
    {
        return $query->where('relationship_type', $type);
    }

    /**
     * Check if this relationship is currently active
     */
    public function isActive(): bool
    {
        return $this->end_at === null;
    }
}
