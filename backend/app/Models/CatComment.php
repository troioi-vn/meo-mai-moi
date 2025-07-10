<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CatComment extends Model
{
    protected $fillable = [
        'user_id',
        'cat_id',
        'comment',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cat(): BelongsTo
    {
        return $this->belongsTo(Cat::class);
    }
}
