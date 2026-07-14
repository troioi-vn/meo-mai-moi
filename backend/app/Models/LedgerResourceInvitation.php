<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LedgerResourceInvitation extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'resource_invitation_id';

    protected $fillable = ['resource_invitation_id', 'ledger_id'];

    public function invitation(): BelongsTo
    {
        return $this->belongsTo(ResourceInvitation::class, 'resource_invitation_id');
    }

    public function ledger(): BelongsTo
    {
        return $this->belongsTo(Ledger::class);
    }
}
