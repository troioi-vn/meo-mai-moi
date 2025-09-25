<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PetPhoto extends Model
{
    protected $fillable = [
        'pet_id',
        'filename',
        'path',
        'size',
        'mime_type',
        'created_by',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }
}