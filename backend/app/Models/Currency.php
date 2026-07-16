<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Currency extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'code';

    protected $keyType = 'string';

    protected $fillable = ['code', 'name', 'symbol', 'minor_units', 'enabled'];

    protected $casts = ['minor_units' => 'integer', 'enabled' => 'boolean'];

    public function ledgers(): HasMany
    {
        return $this->hasMany(Ledger::class, 'currency_code', 'code');
    }

    /** @param Builder<self> $query */
    public function scopeEnabled(Builder $query): Builder
    {
        return $query->where('enabled', true);
    }
}
