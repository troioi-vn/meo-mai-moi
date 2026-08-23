<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\LitterFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property int $pet_type_id
 * @property int $created_by
 */
class Litter extends Model
{
    /** @use HasFactory<LitterFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'pet_type_id',
        'created_by',
    ];

    /**
     * @return BelongsTo<PetType, $this>
     */
    public function petType(): BelongsTo
    {
        return $this->belongsTo(PetType::class);
    }

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
}
