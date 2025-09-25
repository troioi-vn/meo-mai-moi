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
        'pet_id', // Updated from cat_id
        'user_id',
        'from_ts',
        'to_ts',
    ];

    protected $casts = [
        'from_ts' => 'datetime',
        'to_ts' => 'datetime',
    ];

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }


    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
