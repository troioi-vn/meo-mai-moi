<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class City extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'country',
        'description',
        'created_by',
        'approved_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

    protected $appends = ['usage_count'];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function pets(): HasMany
    {
        return $this->hasMany(Pet::class);
    }

    public function helperProfiles(): HasMany
    {
        return $this->hasMany(HelperProfile::class);
    }

    public function scopeForCountry($query, string $country)
    {
        return $query->where('country', strtoupper($country));
    }

    public function scopeApproved($query)
    {
        return $query->whereNotNull('approved_at');
    }

    public function scopeVisibleTo($query, ?User $user)
    {
        return $query->where(function ($q) use ($user) {
            $q->whereNotNull('approved_at');
            if ($user) {
                $q->orWhere('created_by', $user->id);
            }
        });
    }

    public function isApproved(): bool
    {
        return $this->approved_at !== null;
    }

    public function approve(): void
    {
        $this->update(['approved_at' => now()]);
    }

    public function getUsageCountAttribute(): int
    {
        // Count pets using this city. Helper profiles could be added later if needed.
        return $this->pets()->count();
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($city) {
            if (empty($city->slug)) {
                $city->slug = static::generateUniqueSlug($city->name, $city->country);
            }
            $city->country = strtoupper($city->country);
        });

        static::updating(function ($city) {
            if ($city->isDirty('name') && ! $city->isDirty('slug')) {
                $city->slug = static::generateUniqueSlug($city->name, $city->country);
            }
            if ($city->isDirty('country')) {
                $city->country = strtoupper($city->country);
            }
        });
    }

    private static function generateUniqueSlug(string $name, string $country): string
    {
        $baseSlug = Str::slug($name);
        $slug = $baseSlug;
        $counter = 1;

        while (static::where('slug', $slug)->where('country', strtoupper($country))->exists()) {
            $slug = $baseSlug.'-'.$counter;
            $counter++;
        }

        return $slug;
    }
}

