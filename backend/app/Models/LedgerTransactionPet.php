<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LedgerTransactionPet extends Model
{
    public $incrementing = false;

    protected $fillable = ['ledger_transaction_id', 'pet_id', 'pet_name_snapshot'];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(LedgerTransaction::class, 'ledger_transaction_id');
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }
}
