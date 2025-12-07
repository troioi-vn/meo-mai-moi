<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class PetType extends Model
{
    use HasFactory;

    protected $attributes = [
        'placement_requests_allowed' => false,
        'weight_tracking_allowed' => false,
        'microchips_allowed' => false,
    ];

    protected $fillable = [
        'name',
        'slug',
        'description',
        'status',
        'is_system',
        'display_order',
        'placement_requests_allowed',
        'weight_tracking_allowed',
        'microchips_allowed',
        // Backward-compatibility bridge for legacy references
        'is_active',
    ];

    protected $casts = [
        'status' => \App\Enums\PetTypeStatus::class,
        'is_system' => 'boolean',
        'placement_requests_allowed' => 'boolean',
        'weight_tracking_allowed' => 'boolean',
        'microchips_allowed' => 'boolean',
    ];

    /**
     * Get all pets of this type
     */
    public function pets(): HasMany
    {
        return $this->hasMany(Pet::class);
    }

    /**
     * Get all categories for this pet type
     */
    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    /**
     * Check if the pet type is active.
     */
    public function isActive(): bool
    {
        return $this->status === \App\Enums\PetTypeStatus::ACTIVE;
    }

    /**
     * Virtual attribute accessor for legacy `is_active` boolean.
     */
    public function getIsActiveAttribute(): bool
    {
        return $this->isActive();
    }

    /**
     * Virtual attribute mutator mapping `is_active` writes to status enum.
     */
    public function setIsActiveAttribute($value): void
    {
        $bool = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($bool === null) {
            $bool = ! empty($value);
        }
        $this->attributes['status'] = $bool
            ? \App\Enums\PetTypeStatus::ACTIVE->value
            : \App\Enums\PetTypeStatus::INACTIVE->value;
    }

    /**
     * Mark the pet type as active.
     */
    public function markAsActive(): void
    {
        $this->update(['status' => \App\Enums\PetTypeStatus::ACTIVE]);
    }

    /**
     * Mark the pet type as inactive.
     */
    public function markAsInactive(): void
    {
        $this->update(['status' => \App\Enums\PetTypeStatus::INACTIVE]);
    }

    /**
     * Mark the pet type as archived.
     */
    public function markAsArchived(): void
    {
        $this->update(['status' => \App\Enums\PetTypeStatus::ARCHIVED]);
    }

    /**
     * Scope to get only active pet types
     */
    public function scopeActive($query)
    {
        return $query->where('status', \App\Enums\PetTypeStatus::ACTIVE);
    }

    /**
     * Scope to order by display order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order')->orderBy('name');
    }

    /**
     * Boot the model and set up event listeners
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-generate slug from name if not provided
        static::creating(function ($petType) {
            if (! $petType->slug) {
                $petType->slug = Str::slug($petType->name);
            }

            // Sensible defaults for system types when created directly in tests or seeds
            if ($petType->slug === 'cat') {
                $petType->placement_requests_allowed = true;
                $petType->weight_tracking_allowed = true;
                $petType->microchips_allowed = true;
            }
        });
    }
}
