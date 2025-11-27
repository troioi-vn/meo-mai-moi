<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @OA\Schema(
 *     schema="PetMicrochip",
 *     title="PetMicrochip",
 *     description="Pet Microchip model",
 *
 *     @OA\Property(property="id", type="integer", format="int64", description="Microchip ID"),
 *     @OA\Property(property="pet_id", type="integer", format="int64", description="ID of the associated pet"),
 *     @OA\Property(property="chip_number", type="string", description="Unique microchip number"),
 *     @OA\Property(property="issuer", type="string", nullable=true, description="Microchip issuer/manufacturer"),
 *     @OA\Property(property="implanted_at", type="string", format="date", nullable=true, description="Date the microchip was implanted"),
 *     @OA\Property(property="created_at", type="string", format="date-time", description="Timestamp of microchip record creation"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", description="Timestamp of last microchip record update")
 * )
 */
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
