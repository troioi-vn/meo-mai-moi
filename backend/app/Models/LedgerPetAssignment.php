<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LedgerPetAssignmentSource;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LedgerPetAssignment extends Model
{
    protected $fillable = ['ledger_id', 'pet_id', 'source', 'source_group_id', 'added_by_user_id', 'start_at', 'end_at'];

    protected $casts = ['source' => LedgerPetAssignmentSource::class, 'start_at' => 'datetime', 'end_at' => 'datetime'];

    public function ledger(): BelongsTo
    {
        return $this->belongsTo(Ledger::class);
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    /** @param Builder<self> $query */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('end_at');
    }
}
