<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\SerializesTranslatableAsString;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;
use Spatie\Translatable\HasTranslations;

class Category extends Model
{
    use HasFactory;
    use HasTranslations;
    use SerializesTranslatableAsString;

    /**
     * Attributes that are translatable.
     */
    public array $translatable = ['name'];

    protected $fillable = [
        'name',
        'slug',
        'pet_type_id',
        'description',
        'created_by',
        'approved_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

    protected $appends = ['usage_count'];

    /**
     * Get the pet type this category belongs to.
     */
    public function petType(): BelongsTo
    {
        return $this->belongsTo(PetType::class);
    }

    /**
     * Get the user who created this category.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get all pets that have this category.
     */
    public function pets(): BelongsToMany
    {
        return $this->belongsToMany(Pet::class, 'pet_categories')
            ->withTimestamps();
    }

    /**
     * Scope to filter by pet type.
     */
    public function scopeForPetType($query, int $petTypeId)
    {
        return $query->where('pet_type_id', $petTypeId);
    }

    /**
     * Scope to filter approved categories.
     */
    public function scopeApproved($query)
    {
        return $query->whereNotNull('approved_at');
    }

    /**
     * Scope to filter categories created by a specific user or approved.
     */
    public function scopeVisibleTo($query, ?User $user)
    {
        return $query->where(function ($q) use ($user): void {
            $q->whereNotNull('approved_at');
            if ($user) {
                $q->orWhere('created_by', $user->id);
            }
        });
    }

    /**
     * Check if category is approved.
     */
    public function isApproved(): bool
    {
        return $this->approved_at !== null;
    }

    /**
     * Mark category as approved.
     */
    public function approve(): void
    {
        $this->update(['approved_at' => now()]);
    }

    /**
     * Get the usage count (number of pets using this category).
     */
    public function getUsageCountAttribute(): int
    {
        return $this->pets()->count();
    }

    /**
     * Boot method to auto-generate slug.
     */
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($category): void {
            if (empty($category->slug)) {
                $category->slug = Str::slug($category->name);
            }
        });

        static::updating(function ($category): void {
            if ($category->isDirty('name') && ! $category->isDirty('slug')) {
                $category->slug = Str::slug($category->name);
            }
        });
    }
}
