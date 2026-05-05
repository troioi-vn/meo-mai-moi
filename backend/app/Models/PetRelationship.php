<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PetRelationshipType;
use Database\Factories\PetRelationshipFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PetRelationship extends Model
{
    /** @use HasFactory<PetRelationshipFactory> */
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
        *
        * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the pet in this relationship
        *
        * @return BelongsTo<Pet, $this>
     */
    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    /**
     * Get the user who created this relationship
        *
        * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope to get active relationships (no end date)
     *
     * @param Builder<self> $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('end_at');
    }

    /**
     * Scope to get relationships by type
     *
     * @param Builder<self> $query
     * @return Builder<self>
     */
    public function scopeOfType(Builder $query, PetRelationshipType $type): Builder
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
