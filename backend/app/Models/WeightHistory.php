<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\WeightHistoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeightHistory extends Model
{
    /** @use HasFactory<WeightHistoryFactory> */
    use HasFactory;

    protected $fillable = [
        'pet_id',
        'weight_kg',
        'record_date',
    ];

    protected $casts = [
        'record_date' => 'date',
    ];

    /**
     * @return BelongsTo<Pet, $this>
     */
    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }
}
