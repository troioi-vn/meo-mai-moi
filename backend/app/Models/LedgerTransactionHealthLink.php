<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LedgerTransactionHealthLink extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'ledger_transaction_id';

    protected $fillable = ['ledger_transaction_id', 'medical_record_id', 'vaccination_record_id', 'pet_microchip_id'];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(LedgerTransaction::class, 'ledger_transaction_id');
    }
}
