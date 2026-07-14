<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LedgerTransactionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class LedgerTransaction extends Model implements HasMedia
{
    use InteractsWithMedia;
    use SoftDeletes;

    protected $fillable = ['ledger_id', 'account_id', 'category_id', 'type', 'amount_minor', 'occurred_on', 'description', 'created_by_user_id', 'updated_by_user_id'];

    protected $casts = ['type' => LedgerTransactionType::class, 'amount_minor' => 'integer', 'occurred_on' => 'date'];

    public function ledger(): BelongsTo
    {
        return $this->belongsTo(Ledger::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(LedgerAccount::class, 'account_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(LedgerCategory::class, 'category_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function petLinks(): HasMany
    {
        return $this->hasMany(LedgerTransactionPet::class);
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('receipt')->useDisk('private')->singleFile();
    }
}
