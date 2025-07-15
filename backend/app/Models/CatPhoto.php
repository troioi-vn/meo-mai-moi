<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CatPhoto extends Model
{
    protected $fillable = [
        'cat_id',
        'filename',
        'path',
        'size',
        'mime_type',
    ];

    public function cat(): BelongsTo
    {
        return $this->belongsTo(Cat::class);
    }
}
