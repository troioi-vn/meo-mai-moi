<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PetMicrochip extends Model
{
    use HasFactory;

    protected $fillable = [
        'pet_id',
        'chip_number',
        'issuer',
        'implanted_at',
    ];

    protected $casts = [
        'implanted_at' => 'date',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }
}