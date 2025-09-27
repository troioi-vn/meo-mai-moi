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
        'is_active',
        'is_system',
        'display_order',
        'placement_requests_allowed',
        'weight_tracking_allowed',
        'microchips_allowed',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_system' => 'boolean',
        'placement_requests_allowed' => 'boolean',
        'weight_tracking_allowed' => 'boolean',
        'microchips_allowed' => 'boolean',
    ];

    /**
     * Boot the model and set up event listeners
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-generate slug from name if not provided
        static::creating(function ($petType) {
            if (empty($petType->slug)) {
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

    /**
     * Get all pets of this type
     */
    public function pets(): HasMany
    {
        return $this->hasMany(Pet::class);
    }

    /**
     * Scope to get only active pet types
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to order by display order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order')->orderBy('name');
    }
}
