<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ledger extends Model
{
    protected $fillable = ['title', 'currency_code', 'group_id', 'sync_group_pets', 'created_by_user_id', 'archived_at'];

    protected $casts = ['sync_group_pets' => 'boolean', 'archived_at' => 'datetime'];

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'currency_code', 'code');
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(LedgerMembership::class);
    }

    public function activeMemberships(): HasMany
    {
        return $this->memberships()->whereNull('end_at');
    }

    public function accounts(): HasMany
    {
        return $this->hasMany(LedgerAccount::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(LedgerCategory::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(LedgerTransaction::class);
    }

    public function petAssignments(): HasMany
    {
        return $this->hasMany(LedgerPetAssignment::class);
    }

    public function activePetAssignments(): HasMany
    {
        return $this->petAssignments()->whereNull('end_at');
    }

    public function resourceInvitations(): HasMany
    {
        return $this->hasMany(LedgerResourceInvitation::class);
    }

    /** @param Builder<self> $query */
    public function scopeAccessibleBy(Builder $query, User $user): Builder
    {
        return $query->whereHas('activeMemberships', fn (Builder $membership) => $membership->where('user_id', $user->id));
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }
}
