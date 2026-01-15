<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: "WeightHistory",
    title: "WeightHistory",
    description: "Weight History model",
    properties: [
        new OA\Property(property: "id", type: "integer", format: "int64", description: "Weight History ID"),
        new OA\Property(property: "pet_id", type: "integer", format: "int64", description: "ID of the associated pet"),
        new OA\Property(property: "weight_kg", type: "number", format: "float", description: "Recorded weight in kilograms"),
        new OA\Property(property: "record_date", type: "string", format: "date", description: "Date the weight was recorded"),
        new OA\Property(property: "created_at", type: "string", format: "date-time", description: "Timestamp of weight record creation"),
        new OA\Property(property: "updated_at", type: "string", format: "date-time", description: "Timestamp of last weight record update"),
    ]
)]
class WeightHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'pet_id',
        'weight_kg',
        'record_date',
    ];

    protected $casts = [
        'record_date' => 'date',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }
}
