<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LedgerCategoryApplicability;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LedgerCategory extends Model
{
    protected $fillable = ['ledger_id', 'name', 'applies_to', 'created_by_user_id', 'archived_at'];

    protected $casts = ['applies_to' => LedgerCategoryApplicability::class, 'archived_at' => 'datetime'];

    public function ledger(): BelongsTo
    {
        return $this->belongsTo(Ledger::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(LedgerTransaction::class, 'category_id');
    }
}
