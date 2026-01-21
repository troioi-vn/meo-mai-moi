<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'PetMicrochip',
    title: 'PetMicrochip',
    description: 'Pet Microchip model',
    properties: [
        new OA\Property(property: 'id', type: 'integer', format: 'int64', description: 'Microchip ID'),
        new OA\Property(property: 'pet_id', type: 'integer', format: 'int64', description: 'ID of the associated pet'),
        new OA\Property(property: 'chip_number', type: 'string', description: 'Unique microchip number'),
        new OA\Property(property: 'issuer', type: 'string', nullable: true, description: 'Microchip issuer/manufacturer'),
        new OA\Property(property: 'implanted_at', type: 'string', format: 'date', nullable: true, description: 'Date the microchip was implanted'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Timestamp of microchip record creation'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Timestamp of last microchip record update'),
    ]
)]
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
