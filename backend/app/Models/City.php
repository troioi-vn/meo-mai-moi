<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\SerializesTranslatableAsString;
use App\Support\CountryCatalog;
use Database\Factories\CityFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Spatie\Translatable\HasTranslations;

class City extends Model
{
    /** @use HasFactory<CityFactory> */
    use HasFactory;

    use HasTranslations;
    use SerializesTranslatableAsString;

    /**
     * Attributes that are translatable.
     *
     * @var list<string>
     */
    public array $translatable = ['name'];

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

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<Pet, $this>
     */
    public function pets(): HasMany
    {
        return $this->hasMany(Pet::class);
    }

    /**
     * @return HasMany<HelperProfile, $this>
     */
    public function helperProfiles(): HasMany
    {
        return $this->hasMany(HelperProfile::class);
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeForCountry(Builder $query, string $country): Builder
    {
        return $query->where('country', strtoupper($country));
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeApproved(Builder $query): Builder
    {
        return $query->whereNotNull('approved_at');
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeVisibleTo(Builder $query, ?User $user): Builder
    {
        return $query->where(function (Builder $q) use ($user): void {
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

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($city): void {
            if (empty($city->slug)) {
                $city->slug = self::generateUniqueSlug($city->name, $city->country);
            }
            $city->country = strtoupper($city->country);
            Country::firstOrCreate(
                ['code' => $city->country],
                [
                    'name' => $city->country,
                    'phone_prefix' => CountryCatalog::phonePrefix($city->country),
                    'is_active' => true,
                ]
            );
        });

        static::updating(function ($city): void {
            if ($city->isDirty('name') && ! $city->isDirty('slug')) {
                $city->slug = self::generateUniqueSlug($city->name, $city->country);
            }
            if ($city->isDirty('country')) {
                $city->country = strtoupper($city->country);
                Country::firstOrCreate(
                    ['code' => $city->country],
                    [
                        'name' => $city->country,
                        'phone_prefix' => CountryCatalog::phonePrefix($city->country),
                        'is_active' => true,
                    ]
                );
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
