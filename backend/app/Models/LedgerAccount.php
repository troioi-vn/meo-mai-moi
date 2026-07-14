<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LedgerAccount extends Model
{
    protected $fillable = ['ledger_id', 'name', 'created_by_user_id', 'archived_at'];

    protected $casts = ['archived_at' => 'datetime'];

    public function ledger(): BelongsTo
    {
        return $this->belongsTo(Ledger::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(LedgerTransaction::class, 'account_id');
    }
}
