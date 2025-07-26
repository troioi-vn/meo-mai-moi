<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use OpenApi\Annotations as OA;

// ...existing code...
class WeightHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'cat_id',
        'weight_kg',
        'record_date',
    ];

    protected $casts = [
        'record_date' => 'date',
    ];

    public function cat(): BelongsTo
    {
        return $this->belongsTo(Cat::class);
    }
}
