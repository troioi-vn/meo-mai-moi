<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OwnerWeightHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'weight_kg',
        'record_date',
    ];

    protected $casts = [
        'record_date' => 'date',
        'weight_kg' => 'float',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
