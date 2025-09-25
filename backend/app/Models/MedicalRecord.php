<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use OpenApi\Annotations as OA;

// ...existing code...
class MedicalRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'pet_id',
        'record_type',
        'description',
        'record_date',
        'vet_name',
        'attachment_url',
    ];

    protected $casts = [
        'record_date' => 'date',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }
}
