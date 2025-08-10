<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OwnershipHistory extends Model
{
    use HasFactory;

    protected $table = 'ownership_history';

    protected $fillable = [
        'cat_id',
        'user_id',
        'from_ts',
        'to_ts',
    ];

    protected $casts = [
        'from_ts' => 'datetime',
        'to_ts' => 'datetime',
    ];

    public function cat(): BelongsTo
    {
        return $this->belongsTo(Cat::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
